"use server";

import { db, withErrorHandling, logToDesktop } from "@/db";
import { suppliers, purchaseInvoices, vouchers, journalLines, accounts } from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { createJournalEntry } from "@/features/accounting/actions";

const DEFAULT_TENANT = 'tenant_default';

import { getDictionary } from "@/lib/i18n-server";

async function getSuppDict() {
    return await getDictionary();
}

/**
 * Gets the opening balance equity account for the tenant.
 */
async function getOpeningBalanceAccount(tenantId: string) {
    const dict = await getSuppDict();
    let acc = await db.query.accounts.findFirst({
        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '3201'))
    });
    if (!acc) {
        const [newAcc] = await db.insert(accounts).values({
            tenantId,
            name: dict.Accounting.SystemAccounts.OpeningBalance,
            code: '3201',
            type: 'equity',
            balance: '0'
        }).returning();
        acc = newAcc;
    }
    return acc;
}

/**
 * Fetches suppliers with their live accounting balance.
 */
export async function getSuppliers(filter?: 'debtor' | 'creditor') {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));
        logToDesktop(`🔍 [SUPPLIERS] Fetching live balances for tenant: ${tenantId}`);

        const rows = await db.select({
            id: suppliers.id,
            name: suppliers.name,
            companyName: suppliers.companyName,
            phone: suppliers.phone,
            email: suppliers.email,
            address: suppliers.address,
            openingBalance: suppliers.openingBalance,
            // Live Balance from Ledger (Accounts Payable - 2101)
            totalDebt: sql<number>`CAST(COALESCE(${accounts.balance}, '0') AS REAL)`
        })
            .from(suppliers)
            .leftJoin(accounts, and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.code, sql`'2101-' || ${suppliers.id}`)
            ))
            .where(eq(suppliers.tenantId, tenantId))
            .orderBy(desc(suppliers.createdAt));

        let results = rows;
        // For suppliers, a positive balance usually means we owe them (debtor/creditor naming can be confusing, 
        // let's stick to 'creditor' = we owe them, 'debtor' = they owe us/overpaid)
        if (filter === 'creditor') results = rows.filter(r => Number(r.totalDebt) > 0.01);
        if (filter === 'debtor') results = rows.filter(r => Number(r.totalDebt) < -0.01);

        return results;
    } catch (error: any) {
        logToDesktop(`❌ [GET_SUPPLIERS] Fail: ${error.message}`, 'error');
        return [];
    }
}

/**
 * Creates a new supplier and its corresponding accounting ledger.
 */
export async function createSupplier(data: any) {
    const dict = await getSuppDict();
    return await withErrorHandling("createSupplier", async () => {
        logToDesktop(`🚀 [SUPPLIER_CREATE] Starting for: ${data.name}`);

        let tenantId = DEFAULT_TENANT;
        try {
            const session = await requireSession();
            tenantId = session.tenantId;
        } catch (e) {
            logToDesktop(`⚠️ [SUPPLIER_CREATE] Falling back to default tenant.`);
        }

        const name = data.name || data.fullName || data.supplierName;
        if (!name) throw new Error(dict.Suppliers.AddDialog.Errors.NameRequired);

        const existing = await db.select().from(suppliers)
            .where(and(eq(suppliers.tenantId, tenantId), eq(suppliers.name, name)))
            .limit(1);
        if (existing.length > 0) throw new Error(dict.Common.Error);

        const mappedData = {
            tenantId,
            name,
            companyName: data.companyName || null,
            email: data.email || null,
            phone: data.phone || null,
            address: data.address || null,
            taxId: data.taxId || null,
            openingBalance: Number(data.openingBalance || 0),
        };

        const [newSupplier] = await db.insert(suppliers).values(mappedData).returning();
        if (!newSupplier) throw new Error(dict.Common.AddError);

        // 🟢 [ACCOUNTING LINK] Create Ledger Account (Accounts Payable - 2101)
        try {
            const parentAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '2101'))
            });

            if (parentAcc) {
                await db.insert(accounts).values({
                    tenantId,
                    name: name,
                    code: `2101-${newSupplier.id}`,
                    type: 'liability',
                    parentId: parentAcc.id,
                    isActive: true,
                    balance: '0'
                });

                const openBal = Number(data.openingBalance || 0);
                if (openBal !== 0) {
                    const supplierAcc = await db.query.accounts.findFirst({
                        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `2101-${newSupplier.id}`))
                    });

                    if (supplierAcc) {
                        await createJournalEntry({
                            date: new Date().toISOString().split('T')[0],
                            description: `${dict.Accounting.SystemAccounts.OpeningBalance}: ${name}`,
                            reference: `OP-S-${newSupplier.id}`,
                            lines: [
                                { accountId: supplierAcc.id, debit: openBal < 0 ? Math.abs(openBal) : 0, credit: openBal > 0 ? openBal : 0, description: dict.Accounting.SystemAccounts.OpeningBalance },
                                { accountId: (await getOpeningBalanceAccount(tenantId)).id, debit: openBal > 0 ? openBal : 0, credit: openBal < 0 ? Math.abs(openBal) : 0, description: dict.Accounting.SystemAccounts.OpeningBalance }
                            ]
                        });
                    }
                }
            }
        } catch (accErr: any) {
            logToDesktop(`⚠️ [SUPPLIER_ACC] Link failed: ${accErr.message}`, 'error');
        }

        return newSupplier;
    });
}

/**
 * Updates supplier and syncs name with accounting.
 */
export async function updateSupplier(id: number, data: any) {
    return await withErrorHandling("updateSupplier", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));

        const [updated] = await db.update(suppliers)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(suppliers.id, id))
            .returning();

        if (data.name) {
            await db.update(accounts)
                .set({ name: data.name })
                .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, `2101-${id}`)));
        }

        return updated;
    });
}

/**
 * Deletes supplier after safety checks.
 */
export async function deleteSupplier(id: number) {
    const dict = await getSuppDict();
    return await withErrorHandling("deleteSupplier", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));

        // 1. Check for purchase invoices
        const hasInvoices = await db.select().from(purchaseInvoices).where(eq(purchaseInvoices.supplierId, id)).limit(1);
        if (hasInvoices.length > 0) {
            throw new Error(dict.Common.DeleteError);
        }

        // 2. Check balance
        const acc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `2101-${id}`))
        });
        if (acc && Math.abs(Number(acc.balance)) > 0.01) {
            throw new Error(`${dict.Common.DeleteError}: ${acc.balance}`);
        }

        await db.delete(accounts).where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, `2101-${id}`)));
        await db.delete(suppliers).where(eq(suppliers.id, id));

        return { success: true };
    });
}

/**
 * Supplier Statement from Accounting Ledger.
 */
export async function getSupplierStatement(id: number) {
    if (!id || isNaN(id)) return null;

    try {
        const tenantId = 'tenant_default';

        const supplier = await db.query.suppliers.findFirst({
            where: eq(suppliers.id, id)
        });

        if (!supplier) return null;

        const acc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `2101-${id}`)),
            with: {
                journalLines: {
                    with: { journalEntry: true }
                }
            }
        });

        const transactions = acc?.journalLines
            ? acc.journalLines
                .filter(line => line && line.journalEntry)
                .map(line => ({
                    id: line.id,
                    date: line.journalEntry!.transactionDate,
                    description: line.description || line.journalEntry!.description || '-',
                    reference: line.journalEntry!.reference || '-',
                    debit: Number(line.debit || 0),
                    credit: Number(line.credit || 0)
                }))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            : [];

        let runningBalance = Number(supplier.openingBalance || 0);
        const history = transactions.map(t => {
            // Supplier is a Liability (Credit balance). Balance increases with credit, decreases with debit.
            runningBalance += (t.credit - t.debit);
            return { ...t, balance: runningBalance };
        });

        return {
            supplier,
            transactions: history,
            summary: {
                openingBalance: Number(supplier.openingBalance || 0),
                totalDebit: transactions.reduce((sum, t) => sum + t.debit, 0),
                totalCredit: transactions.reduce((sum, t) => sum + t.credit, 0),
                netBalance: runningBalance
            }
        };
    } catch (error: any) {
        console.error("Statement Load Error:", error);
        return null;
    }
}

/**
 * Bulk Import with Accounting Links.
 */
export async function bulkImportSuppliers(suppliersList: any[]) {
    const dict = await getSuppDict();
    return await withErrorHandling("bulkImportSuppliers", async () => {
        let count = 0;
        for (const raw of suppliersList) {
            const name = raw["Name"] || raw["name"];
            if (!name) continue;

            const res = await createSupplier({
                name: String(name),
                companyName: raw["Company"],
                phone: raw["Phone"],
                openingBalance: Number(raw["Opening Balance"] || 0)
            });

            if (res.success) count++;
        }
        return dict.Common.Success;
    });
}
