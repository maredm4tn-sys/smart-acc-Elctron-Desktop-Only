"use server";

import { db, withErrorHandling, logToDesktop } from "@/db";
import { customers, invoices, vouchers, journalLines, accounts } from "@/db/schema";
import { eq, desc, and, or, sql } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { createJournalEntry } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";

const loadDictionary = async () => {
    return await getDictionary();
};

const DEFAULT_TENANT = 'tenant_default';

function cleanPhone(phone: any): string | null {
    if (!phone) return null;
    let p = String(phone).trim();
    // Remove .0 if it's from an Excel float (e.g., "1034870364.0")
    if (p.endsWith('.0')) p = p.slice(0, -2);

    // Egyptian Mobile Numbers Logic:
    // If length is 10 and starts with '1', it's almost certainly an Egyptian number missing its leading '0'
    // (e.g., 10..., 11..., 12..., 15...)
    if (p.length === 10 && /^[1]/.test(p)) {
        p = '0' + p;
    }

    return p;
}

async function getOpeningBalanceAccount(tenantId: string) {
    let acc = await db.query.accounts.findFirst({
        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '3201'))
    });
    if (!acc) {
        const [newAcc] = await db.insert(accounts).values({
            tenantId,
            name: (await loadDictionary()).Accounting.SystemAccounts.OpeningBalance,
            code: '3201',
            type: 'equity',
            balance: '0'
        }).returning();
        acc = newAcc;
    }
    return acc;
}

export async function createCustomer(data: any) {
    return await withErrorHandling("createCustomer", async () => {
        logToDesktop(`🚀 [CREATE] Starting for: ${data.name}`);

        let tenantId = DEFAULT_TENANT;
        try {
            const session = await requireSession();
            tenantId = session.tenantId;
        } catch (e) {
            logToDesktop(`⚠️ [SESSION] Fallback to default tenant.`);
        }

        const dict = await loadDictionary();
        const name = data.name || data.fullName || data.customerName;
        if (!name) throw new Error(dict.Customers.AddDialog.Errors.NameRequired);

        const existing = await db.select().from(customers)
            .where(and(eq(customers.tenantId, tenantId), eq(customers.name, name)))
            .limit(1);
        if (existing.length > 0) throw new Error(dict.Common.Error);

        const mappedData = {
            tenantId,
            name,
            companyName: data.companyName || null,
            email: data.email || null,
            phone: cleanPhone(data.phone),
            address: data.address || null,
            taxId: data.taxId || null,
            nationalId: data.nationalId || null,
            priceLevel: data.priceLevel || 'retail',
            creditLimit: Number(data.creditLimit || 0),
            openingBalance: Number(data.openingBalance || 0),
            representativeId: data.representativeId ? Number(data.representativeId) : null,
        };

        const [newCustomer] = await db.insert(customers).values(mappedData).returning();
        if (!newCustomer) throw new Error(dict.Common.AddError);

        // 🟢 [ACCOUNTING LINK] Create Ledger Account
        try {
            const parentAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1103'))
            });

            if (parentAcc) {
                await db.insert(accounts).values({
                    tenantId,
                    name: name,
                    code: `1103-${newCustomer.id}`,
                    type: 'asset',
                    parentId: parentAcc.id,
                    isActive: true,
                    balance: '0'
                });

                const openBal = Number(data.openingBalance || 0);
                if (openBal !== 0) {
                    const customerAcc = await db.query.accounts.findFirst({
                        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `1103-${newCustomer.id}`))
                    });

                    if (customerAcc) {
                        // Correct Accounting Logic: 
                        // If openBal > 0 (Customer owes us): Debit Customer (+Asset), Credit Opening Balance (+Equity-ish)
                        // If openBal < 0 (We owe Customer): Credit Customer (+Liability style), Debit Opening Balance
                        await createJournalEntry({
                            date: new Date().toISOString().split('T')[0],
                            description: `${dict.Accounting.SystemAccounts.OpeningBalance}: ${name}`,
                            reference: `OP-${newCustomer.id}`,
                            lines: [
                                {
                                    accountId: customerAcc.id,
                                    debit: openBal > 0 ? Math.abs(openBal) : 0,
                                    credit: openBal < 0 ? Math.abs(openBal) : 0,
                                    description: dict.Accounting.SystemAccounts.OpeningBalance
                                },
                                {
                                    accountId: (await getOpeningBalanceAccount(tenantId)).id,
                                    debit: openBal < 0 ? Math.abs(openBal) : 0,
                                    credit: openBal > 0 ? Math.abs(openBal) : 0,
                                    description: dict.Accounting.SystemAccounts.OpeningBalance
                                }
                            ]
                        });
                        logToDesktop(`✅ [ACCOUNTING] Created opening entry for ${name} with value ${openBal}`);
                    }
                }
            }
        } catch (accErr) {
            logToDesktop(`⚠️ [ACCOUNTING] Link failed for ${name}: ${accErr.message}`, 'error');
        }

        return newCustomer;
    });
}

export async function getCustomers(filter?: 'debtor' | 'creditor') {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));

        const rows = await db.select({
            id: customers.id,
            name: customers.name,
            companyName: customers.companyName,
            email: customers.email,
            phone: customers.phone,
            address: customers.address,
            creditLimit: customers.creditLimit,
            openingBalance: customers.openingBalance,
            priceLevel: customers.priceLevel,
            totalDebt: sql<number>`CAST(COALESCE(${accounts.balance}, '0') AS REAL)`
        })
            .from(customers)
            .leftJoin(accounts, and(
                eq(accounts.tenantId, tenantId),
                or(
                    eq(accounts.code, sql`'1103-' || ${customers.id}`),
                    eq(accounts.name, customers.name) // Fallback by name if code link is broken
                )
            ))
            .where(eq(customers.tenantId, tenantId))
            .orderBy(desc(customers.createdAt));

        // Format phones and debts
        const formatted = rows.map(r => ({
            ...r,
            phone: cleanPhone(r.phone),
            totalDebt: Number(r.totalDebt || 0)
        }));

        if (filter === 'debtor') return formatted.filter(r => r.totalDebt > 0.01);
        if (filter === 'creditor') return formatted.filter(r => r.totalDebt < -0.01);
        return formatted;
    } catch (error: any) {
        logToDesktop(`❌ [GET_CUSTOMERS] Fail: ${error.message}`, 'error');
        return [];
    }
}

export async function updateCustomer(id: number, data: any) {
    return await withErrorHandling("updateCustomer", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));

        // 1. Update Customer Record
        const [updated] = await db.update(customers).set({
            ...data,
            updatedAt: new Date()
        }).where(eq(customers.id, id)).returning();

        // 2. Sync with Accounting Account Name
        if (data.name) {
            await db.update(accounts)
                .set({ name: data.name })
                .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, `1103-${id}`)));
        }

        return updated;
    });
}

export async function deleteCustomer(id: number) {
    return await withErrorHandling("deleteCustomer", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));
        const dict = await loadDictionary();

        // 1. Safety Check: Does the customer have invoices?
        const customerInvoices = await db.select().from(invoices).where(eq(invoices.customerId, id)).limit(1);
        if (customerInvoices.length > 0) {
            throw new Error(dict.Common.DeleteError);
        }

        // 2. Safety Check: Is the balance zero?
        const acc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `1103-${id}`))
        });
        if (acc && Math.abs(Number(acc.balance)) > 0.01) {
            throw new Error(dict.Common.DeleteError);
        }

        // 3. Delete
        await db.delete(accounts).where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, `1103-${id}`)));
        await db.delete(customers).where(eq(customers.id, id));

        return true;
    });
}

export async function bulkImportCustomers(customersList: any[]) {
    return await withErrorHandling("bulkImportCustomers", async () => {
        const dict = await loadDictionary();
        let count = 0;

        // Map localized headers to internal keys
        const m = {
            name: [dict.Customers.Table.Name, dict.Customers.AddDialog.Name, "Name", "name", "full name", "الاسم", "اسم العميل"],
            phone: [dict.Customers.Table.Phone, dict.Customers.AddDialog.Phone, "Phone", "phone", "الهاتف", "رقم الهاتف", "موبايل"],
            company: [dict.Customers.Table.Company, dict.Customers.AddDialog.Company, "Company", "company", "الشركة", "اسم الشركة"],
            address: [dict.Customers.Table.Address, dict.Customers.AddDialog.Address, "Address", "address", "العنوان"],
            balance: [dict.Customers.AddDialog.OpeningBalance, "Opening Balance", "balance", "الرصيد الافتتاحي", "إجمالي المديونية"],
            priceLevel: [dict.Customers.AddDialog.PriceLevel, "Price Level", "price_level", "مستوى التسعير"]
        };

        const find = (raw: any, keys: string[]) => {
            for (const k of keys) {
                if (raw[k] !== undefined) return raw[k];
                const match = Object.keys(raw).find(rk => {
                    const cleanK = k.toLowerCase().trim();
                    const cleanRK = rk.toLowerCase().trim();
                    return cleanRK === cleanK || cleanRK.includes(cleanK) || cleanK.includes(cleanRK);
                });
                if (match !== undefined) return raw[match];
            }
            return undefined;
        };

        for (const raw of customersList) {
            try {
                const name = find(raw, m.name);
                if (!name) continue;

                const res = await createCustomer({
                    name: String(name),
                    companyName: find(raw, m.company) || "",
                    phone: find(raw, m.phone) ? String(find(raw, m.phone)) : "",
                    address: find(raw, m.address) || "",
                    openingBalance: Number(find(raw, m.balance) || 0),
                    priceLevel: find(raw, m.priceLevel) || 'retail'
                });

                if (res) count++;
            } catch (err: any) {
                console.error("Customer Import Row Error:", err);
            }
        }
        return count;
    });
}

export async function getCustomerStatement(id: number) {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: DEFAULT_TENANT }));
        const [customer] = await db.select().from(customers).where(eq(customers.id, id));
        if (!customer) return null;

        // Fetch Accounting Data (The Source of Truth)
        const acc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, `1103-${id}`)),
            with: {
                journalLines: {
                    with: { journalEntry: true }
                }
            }
        });

        const transactions = await Promise.all((acc?.journalLines || []).map(async (line) => {
            const ref = line.journalEntry.reference;
            let dueDate = null;

            // If it's an invoice, try to find the due date
            if (ref && (ref.startsWith('INV-') || ref.includes('INV'))) {
                const inv = await db.query.invoices.findFirst({
                    where: and(eq(invoices.tenantId, tenantId), eq(invoices.invoiceNumber, ref))
                });
                dueDate = inv?.dueDate;
            }

            return {
                id: line.id,
                date: line.journalEntry.transactionDate || line.journalEntry.createdAt,
                dueDate,
                description: line.description || line.journalEntry.description,
                ref: line.journalEntry.reference,
                reference: line.journalEntry.reference,
                debit: Number(line.debit || 0),
                credit: Number(line.credit || 0),
                type: (line.debit > 0 && !line.credit) ? 'INVOICE' : 'PAYMENT'
            };
        }));

        // Sort by date then by id to ensure order
        transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = 0; // Start from 0 because opening balance is already in transactions
        const history = transactions.map(t => {
            runningBalance += (t.debit - t.credit);
            return { ...t, balance: runningBalance };
        });

        return {
            customer,
            transactions: history,
            summary: {
                openingBalance: Number(customer.openingBalance),
                totalDebit: transactions.reduce((sum, t) => sum + t.debit, 0),
                totalCredit: transactions.reduce((sum, t) => sum + t.credit, 0),
                netBalance: runningBalance
            }
        };
    } catch (error) {
        logToDesktop(`Failed to load statement: ${error.message}`, 'error');
        return null;
    }
}
