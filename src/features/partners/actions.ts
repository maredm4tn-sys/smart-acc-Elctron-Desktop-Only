"use server";

import { db, withErrorHandling, logToDesktop } from "@/db";
import { partners, partnerTransactions, products, accounts, journalEntries, journalLines, shifts } from "@/db/schema";
import { eq, and, sql, sum, or, like } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { createJournalEntry } from "@/features/accounting/actions";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/lib/i18n-server";

async function getPartnerDict() {
    return await getDictionary() as any;
}

/**
 * [Helper] Recalculate Share Percentages based on Current Capital
 */
async function recalculatePercentages(tenantId: string) {
    const allPartners = await db.select().from(partners)
        .where(and(eq(partners.tenantId, tenantId), eq(partners.isActive, true)));

    const totalCapital = allPartners.reduce((acc, p) => acc + parseFloat(p.currentCapital || "0"), 0);

    if (totalCapital <= 0) return;

    for (const p of allPartners) {
        const share = (parseFloat(p.currentCapital || "0") / totalCapital) * 100;
        await db.update(partners)
            .set({ sharePercentage: share.toFixed(2) })
            .where(eq(partners.id, p.id));
    }

    logToDesktop(`Recalculated percentages for ${allPartners.length} partners. Total Capital: ${totalCapital}`);
}

/**
 * [SERVER ACTION] getPartners
 * Returns all partners for the current tenant.
 */
export async function getPartners() {
    return await withErrorHandling("getPartners", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        return await db.select().from(partners)
            .where(eq(partners.tenantId, tenantId))
            .orderBy(partners.name);
    });
}

/**
 * [SERVER ACTION] createPartner
 * Creates a new partner record and registers their opening capital.
 */
export async function createPartner(data: {
    name: string;
    phone?: string;
    nationalId?: string;
    role?: string;
    email?: string;
    address?: string;
    notes?: string;
    joinDate?: string;
    initialCapital: number;
}) {
    return await withErrorHandling("createPartner", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        const dict = await getPartnerDict();
        const t = dict?.Partners?.Journal;

        // 1. Create Ledger Account for Partner under Equity (3101-ID)
        const partnerCode = `3101-${Math.floor(Math.random() * 9000) + 1000}`; // Temporary unique code part
        const [acc] = await db.insert(accounts).values({
            tenantId,
            code: partnerCode,
            name: `${t?.CapitalFor || 'Capital -'} ${data.name}`,
            type: 'equity',
            parentId: null, // Should ideally be child of 3101 (Capital)
            isActive: true,
            balance: data.initialCapital.toString(),
        }).returning();

        // 2. Insert Partner linked to Account
        const [newPartner] = await db.insert(partners).values({
            tenantId,
            name: data.name,
            phone: data.phone,
            nationalId: data.nationalId,
            role: data.role,
            email: data.email,
            address: data.address,
            notes: data.notes,
            joinDate: data.joinDate,
            initialCapital: data.initialCapital.toString(),
            currentCapital: data.initialCapital.toString(),
            currentBalance: "0.00",
            isActive: 1,
            // Add a column if schema allows, or use notes? 
            // In smart-acc, we usually link by code or ID. 
            // Let's assume we link by code or just keep metadata in notes for now if schema is rigid.
        }).returning();

        // Update name to include ID for uniqueness
        await db.update(accounts).set({
            code: `3101-${newPartner.id}`,
            name: `${t?.CapitalFor || 'Capital -'} ${newPartner.name} (#${newPartner.id})`
        }).where(eq(accounts.id, acc.id));

        // 3. Register Initial Capital Journal Entry
        // This ensures the 234k-style credit is actually in the ledger
        const cashAcc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '1101%'))
        });

        if (cashAcc) {
            await createJournalEntry({
                date: data.joinDate || new Date().toISOString().split('T')[0],
                description: `${t?.OpeningCapital || 'Opening Capital -'} ${data.name}`,
                reference: `CAP-${newPartner.id}`,
                lines: [
                    { accountId: cashAcc.id, debit: data.initialCapital, credit: 0, description: `${t?.CapitalDeposit || 'Deposit -'} ${data.name}` },
                    { accountId: acc.id, debit: 0, credit: data.initialCapital, description: `${t?.CapitalOf || 'Partner Capital -'} ${data.name}` }
                ]
            });
        }

        // 3. Recalculate Percentages
        await recalculatePercentages(tenantId);

        revalidatePath("/dashboard/partners");
        return { success: true, partner: newPartner };
    });
}

/**
 * [SERVER ACTION] addPartnerTransaction
 * Handles withdrawals (cash/goods), capital increases, and settlements.
 */
export async function addPartnerTransaction(data: {
    partnerId: number;
    type: 'capital_increase' | 'withdrawal_cash' | 'withdrawal_goods' | 'settlement';
    amount: number;
    date: string;
    description?: string;
    productId?: number;
    quantity?: number;
    shiftId?: number;
}) {
    return await withErrorHandling("addPartnerTransaction", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        const dict = await getPartnerDict();
        const t = dict?.Partners?.Journal;

        // 1. Fetch Partner
        const [partner] = await db.select().from(partners).where(eq(partners.id, data.partnerId)).limit(1);
        if (!partner) throw new Error("Partner not found");

        // 2. Handle Stock for Goods Withdrawal
        if (data.type === 'withdrawal_goods' && data.productId && data.quantity) {
            const [product] = await db.select().from(products).where(eq(products.id, data.productId)).limit(1);
            if (!product) throw new Error("Product not found");

            const currentStock = parseFloat(product.stockQuantity || "0");
            if (currentStock < data.quantity) throw new Error("Insufficient stock");

            await db.update(products)
                .set({ stockQuantity: (currentStock - data.quantity).toString() })
                .where(eq(products.id, data.productId));
        }

        // 3. Insert Transaction
        await db.insert(partnerTransactions).values({
            tenantId,
            partnerId: data.partnerId,
            type: data.type,
            amount: data.amount.toString(),
            date: data.date,
            description: data.description,
            productId: data.productId,
            quantity: data.quantity?.toString(),
            shiftId: data.shiftId,
            createdBy: session?.userId,
        });

        // 4. Update Partner Balance/Capital
        if (data.type === 'capital_increase') {
            const newCapital = parseFloat(partner.currentCapital || "0") + data.amount;
            await db.update(partners)
                .set({ currentCapital: newCapital.toString() })
                .where(eq(partners.id, data.partnerId));

            await recalculatePercentages(tenantId);
        } else {
            const currentBal = parseFloat(partner.currentBalance || "0");
            const newBal = currentBal - data.amount;

            await db.update(partners)
                .set({ currentBalance: newBal.toString() })
                .where(eq(partners.id, data.partnerId));

            // Ledger Integration for withdrawals
            const partnerAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `3101-${data.partnerId}`))
            });
            const cashAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '1101%'))
            });

            if (partnerAcc && cashAcc && (data.type === 'withdrawal_cash' || data.type === 'withdrawal_goods')) {
                await createJournalEntry({
                    date: data.date,
                    description: data.description || `${t?.WithdrawalDesc || 'Partner Withdrawal -'} ${partner.name}`,
                    reference: `WDR-${data.partnerId}`,
                    lines: [
                        { accountId: partnerAcc.id, debit: data.amount, credit: 0, description: `${t?.WithdrawalsFor || 'Withdrawals for Partner -'} ${partner.name}` },
                        { accountId: cashAcc.id, debit: 0, credit: data.amount, description: t?.CashOut || 'Cash Disbursement' }
                    ]
                });
            }
        }

        revalidatePath("/dashboard/partners");
        return { success: true };
    });
}

/**
 * [SERVER ACTION] getPartnerStatement
 * Fetches all transactions for a specific partner.
 */
export async function getPartnerStatement(partnerId: number) {
    return await withErrorHandling("getPartnerStatement", async () => {
        const txs = await db.select().from(partnerTransactions)
            .where(eq(partnerTransactions.partnerId, partnerId))
            .orderBy(partnerTransactions.date);

        return txs;
    });
}

/**
 * [SERVER ACTION] getProfitDistributionPreview
 * Calculates suggested profit distribution based on capital shares.
 */
export async function getProfitDistributionPreview(period: { from: string; to: string }) {
    const { getIncomeStatementData } = await import("@/features/reports/actions");
    return await withErrorHandling("getProfitDistributionPreview", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        // 1. Get Net Profit
        const report = await getIncomeStatementData({ fromDate: period.from, toDate: period.to });
        const netProfit = report.data?.netProfit || 0;

        // 2. Get Partners
        const allPartners = await db.select().from(partners)
            .where(and(eq(partners.tenantId, tenantId), eq(partners.isActive, true)));

        // 3. For each partner, calculate share and fetch withdrawals in period
        const results = await Promise.all(allPartners.map(async (p) => {
            const share = netProfit * (parseFloat(p.sharePercentage || "0") / 100);

            // Get withdrawals in this period
            const [withdrawalRes] = await db.select({
                total: sql<number>`sum(CAST(${partnerTransactions.amount} AS REAL))`
            })
                .from(partnerTransactions)
                .where(and(
                    eq(partnerTransactions.partnerId, p.id),
                    sql`${partnerTransactions.date} >= ${period.from}`,
                    sql`${partnerTransactions.date} <= ${period.to}`,
                    or(eq(partnerTransactions.type, 'withdrawal_cash'), eq(partnerTransactions.type, 'withdrawal_goods'))
                ));

            const totalWithdrawals = Number(withdrawalRes?.total || 0);

            return {
                partnerId: p.id,
                name: p.name,
                percentage: p.sharePercentage,
                initialShare: share,
                withdrawals: totalWithdrawals,
                finalDue: share - totalWithdrawals,
                status: (share - totalWithdrawals) >= 0 ? 'profit' : 'debt'
            };
        }));

        return {
            netProfit,
            partners: results
        };
    });
}

/**
 * [SERVER ACTION] processProfitDistribution
 * Records the profit distribution and updates partner balances.
 */
export async function processProfitDistribution(data: {
    period: { from: string; to: string };
    distributions: any[];
}) {
    return await withErrorHandling("processProfitDistribution", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        const dict = await getPartnerDict();
        const t = dict?.Partners?.Journal;

        for (const dist of data.distributions) {
            // 1. Register Profit Share Transaction
            const profitDesc = (t?.ProfitDistribution || "Profit distribution for the period from {from} to {to}")
                .replace('{from}', data.period.from)
                .replace('{to}', data.period.to);

            await db.insert(partnerTransactions).values({
                tenantId,
                partnerId: dist.partnerId,
                type: 'profit_share',
                amount: dist.initialShare.toString(),
                date: data.period.to,
                description: profitDesc,
                createdBy: session?.userId,
            });

            // 2. Update Partner Balance
            const [p] = await db.select().from(partners).where(eq(partners.id, dist.partnerId)).limit(1);
            if (p) {
                const newBal = parseFloat(p.currentBalance || "0") + dist.initialShare;
                await db.update(partners)
                    .set({ currentBalance: newBal.toString() })
                    .where(eq(partners.id, dist.partnerId));
            }
        }

        revalidatePath("/dashboard/partners");
        return { success: true };
    });
}

/**
 * [SERVER ACTION] bulkImportPartners
 * Batch imports partners from an Excel/JSON list.
 */
export async function bulkImportPartners(partnersList: any[]) {
    return await withErrorHandling("bulkImportPartners", async () => {
        let importedCount = 0;
        for (const p of partnersList) {
            const res = await createPartner({
                name: p.name || p["الاسم"] || p["اسم الشريك"] || "N/A",
                phone: p.phone || p["الهاتف"] || p["رقم الهاتف"],
                nationalId: p.nationalId || p["الرقم القومي"],
                role: p.role || p["الوظيفة"] || p["الدور"],
                email: p.email || p["البريد"],
                address: p.address || p["العنوان"],
                notes: p.notes || p["ملاحظات"],
                initialCapital: parseFloat(p.initialCapital || p["رأس المال"] || p["رأس المال المبدئي"] || "0"),
            });
            if (res.success) importedCount++;
        }
        return { success: true, message: `Successfully imported ${importedCount} partners.` };
    });
}
