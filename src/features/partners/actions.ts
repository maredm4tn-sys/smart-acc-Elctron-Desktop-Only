"use server";

import { db, withErrorHandling, logToDesktop } from "@/db";
import { partners, partnerTransactions, products, accounts, journalEntries, journalLines, shifts } from "@/db/schema";
import { eq, and, sql, sum } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { createJournalEntry } from "@/features/accounting/actions";
import { revalidatePath } from "next/cache";

/**
 * 🛠️ [Helper] Recalculate Share Percentages
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

    logToDesktop(`📈 Recalculated percentages for ${allPartners.length} partners. Total Capital: ${totalCapital}`);
}

/**
 * 👨‍💼 [SERVER ACTION] getPartners
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
 * 🆕 [SERVER ACTION] createPartner
 */
export async function createPartner(data: {
    name: string;
    phone?: string;
    nationalId?: string;
    role?: string;
    initialCapital: number;
}) {
    return await withErrorHandling("createPartner", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        // 1. Insert Partner
        const [newPartner] = await db.insert(partners).values({
            tenantId,
            name: data.name,
            phone: data.phone,
            nationalId: data.nationalId,
            role: data.role,
            initialCapital: data.initialCapital.toString(),
            currentCapital: data.initialCapital.toString(),
            currentBalance: "0.00",
            isActive: 1,
        }).returning();

        // 2. Register Initial Capital Transaction
        await db.insert(partnerTransactions).values({
            tenantId,
            partnerId: newPartner.id,
            type: 'capital_increase',
            amount: data.initialCapital.toString(),
            date: new Date().toISOString().split('T')[0],
            description: "Opening Capital Deposit",
            createdBy: session?.userId,
        });

        // 3. Recalculate Percentages
        await recalculatePercentages(tenantId);

        revalidatePath("/dashboard/partners");
        return { success: true, partner: newPartner };
    });
}

/**
 * 💸 [SERVER ACTION] addPartnerTransaction (Withdrawals, Capital Changes)
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
            // Withdrawals or Settlements affect the current balance (Current Account)
            // Balance is managed as: Credits (Earnings) - Debits (Withdrawals)
            // Here withdrawals decrease the balance.
            const currentBal = parseFloat(partner.currentBalance || "0");
            const newBal = currentBal - data.amount; // Withdrawals are debits

            await db.update(partners)
                .set({ currentBalance: newBal.toString() })
                .where(eq(partners.id, data.partnerId));
        }

        revalidatePath("/dashboard/partners");
        return { success: true };
    });
}

/**
 * 📅 [SERVER ACTION] getPartnerStatement
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
 * 📊 [SERVER ACTION] getProfitDistributionPreview
 */
export async function getProfitDistributionPreview(period: { from: string; to: string }) {
    const { getIncomeStatementData } = await import("@/features/reports/actions");
    const { eq, and, sql, or } = await import("drizzle-orm");

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
 * 🔒 [SERVER ACTION] processProfitDistribution
 */
export async function processProfitDistribution(data: {
    period: { from: string; to: string };
    distributions: any[]; // Result from preview
}) {
    return await withErrorHandling("processProfitDistribution", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        for (const dist of data.distributions) {
            // 1. Register Profit Share Transaction (Credit to Balance)
            await db.insert(partnerTransactions).values({
                tenantId,
                partnerId: dist.partnerId,
                type: 'profit_share',
                amount: dist.initialShare.toString(),
                date: data.period.to, // End of period
                description: `Profit distribution for the period from ${data.period.from} to ${data.period.to}`,
                createdBy: session?.userId,
            });

            // 2. Update Partner Balance
            // Balance is managed as Earnings - Withdrawals
            // Earnings (Profit Share) increase balance
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
