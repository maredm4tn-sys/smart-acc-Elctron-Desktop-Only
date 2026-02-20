"use server";

import { db } from "@/db";
import { vouchers, accounts, customers, suppliers, journalEntries, journalLines } from "@/db/schema";
import { eq, and, like, desc, count } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { z } from "zod";
import { getSettings } from "@/features/settings/actions";
import { createJournalEntry } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";

async function getVoucherDict() {
    return await getDictionary() as any;
}

const createVoucherSchema = z.object({
    type: z.enum(['receipt', 'payment']),
    date: z.string(),
    amount: z.number().positive(),
    description: z.string().optional(),
    reference: z.string().optional(),
    partyType: z.enum(['customer', 'supplier', 'other']).optional(),
    partyId: z.number().optional(),
    accountId: z.number().optional(),
});

export async function createVoucher(input: z.infer<typeof createVoucherSchema>) {
    const validation = createVoucherSchema.safeParse(input);
    const dict = await getVoucherDict();

    if (!validation.success) {
        return { success: false, message: dict.Vouchers?.Messages?.InvalidData };
    }

    const data = validation.data;

    try {
        const { tenantId, userId } = await requireSession();

        const [countRes] = await db.select({ value: count() }).from(vouchers).where(eq(vouchers.tenantId, tenantId));
        const voucherCount = Number(countRes?.value || 0);
        const prefix = data.type === 'receipt' ? 'RV' : 'PV';
        const number = `${prefix}-${(voucherCount + 1).toString().padStart(6, '0')}`;

        const formattedDate = data.date.includes('T') ? data.date.split('T')[0] : data.date;

        const [newVoucher] = await db.insert(vouchers).values({
            tenantId,
            voucherNumber: number,
            type: data.type as 'receipt' | 'payment',
            date: formattedDate,
            amount: Number(data.amount).toFixed(2),
            description: data.description,
            reference: data.reference,
            partyType: data.partyType as any,
            partyId: data.partyId ? Number(data.partyId) : null,
            accountId: data.accountId ? Number(data.accountId) : null,
            status: 'posted',
            createdBy: userId
        }).returning();

        if (!newVoucher) {
            throw new Error(dict.Vouchers?.Errors?.CreateFailed);
        }

        const cashName = dict.Vouchers?.System?.CashAccountDefault;
        let cashAccount = await db.query.accounts.findFirst({
            where: (acc, { and, eq, or, like }) => and(
                eq(acc.tenantId, tenantId),
                or(
                    like(acc.name, `%${cashName}%`),
                    like(acc.code, '101%')
                )
            )
        });

        if (!cashAccount) {
            const [newCash] = await db.insert(accounts).values({
                tenantId, name: cashName, code: "101001", type: 'asset'
            }).returning();
            cashAccount = newCash;
        }

        let targetAccountId: number | null = null;
        let targetDescription = "";

        if (data.partyType === 'other' && data.accountId) {
            targetAccountId = data.accountId;
            targetDescription = dict.Vouchers?.System?.GeneralAccount;
        } else if (data.partyType === 'customer' && data.partyId) {
            const customer = await db.query.customers.findFirst({
                where: (cust, { eq, and }) => and(eq(cust.id, data.partyId!), eq(cust.tenantId, tenantId))
            });
            if (customer) {
                const arAccount = await getOrCreateSpecificAccount(tenantId, customer.name, '1103', 'asset', customer.id);
                targetAccountId = arAccount.id;
                targetDescription = `${dict.Vouchers?.Form?.Types?.Customer}: ${customer.name}`;
            }
        } else if (data.partyType === 'supplier' && data.partyId) {
            const supplier = await db.query.suppliers.findFirst({
                where: (supp, { eq, and }) => and(eq(supp.id, data.partyId!), eq(supp.tenantId, tenantId))
            });
            if (supplier) {
                const apAccount = await getOrCreateSpecificAccount(tenantId, supplier.name, '2101', 'liability', supplier.id);
                targetAccountId = apAccount.id;
                targetDescription = `${dict.Vouchers?.Form?.Types?.Supplier}: ${supplier.name}`;
            }
        }

        if (cashAccount && targetAccountId) {
            const lines: any[] = [];
            const settings = await getSettings();
            if (data.type === 'receipt') {
                lines.push({ accountId: cashAccount.id, debit: data.amount, credit: 0, description: `${dict.Vouchers?.System?.Journal?.Receipt} - ${targetDescription}` });
                lines.push({ accountId: targetAccountId, debit: 0, credit: data.amount, description: `${dict.Vouchers?.System?.Journal?.PaymentFrom} ${targetDescription}` });
            } else {
                lines.push({ accountId: targetAccountId, debit: data.amount, credit: 0, description: `${dict.Vouchers?.System?.Journal?.Disbursement} - ${targetDescription}` });
                lines.push({ accountId: cashAccount.id, debit: 0, credit: data.amount, description: dict.Vouchers?.System?.Journal?.CashOut });
            }
            await createJournalEntry({
                date: data.date,
                reference: newVoucher.voucherNumber,
                description: `${data.type === 'receipt' ? (dict.Vouchers?.System?.Journal?.PrefixReceipt) : (dict.Vouchers?.System?.Journal?.PrefixPayment)} - ${data.description || ''}`,
                currency: settings?.currency || "EGP",
                lines: lines
            });
        }

        return { success: true, message: dict.Vouchers?.Messages?.Success, id: newVoucher.id };
    } catch (e: any) {
        console.error("Create Voucher Error:", e);
        return {
            success: false,
            message: `${dict.Vouchers?.Errors?.CreateFailed}: ${e.message}`
        };
    }
}

export async function getOrCreateSpecificAccount(tenantId: string, name: string, codePrefix: string, type: any, entityId?: number) {
    const targetCode = entityId ? `${codePrefix}-${entityId}` : null;

    let account = targetCode ? await db.query.accounts.findFirst({
        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, targetCode))
    }) : null;

    if (!account) {
        account = await db.query.accounts.findFirst({
            where: (acc, { and, eq, sql, or }) => and(
                eq(acc.tenantId, tenantId),
                or(
                    eq(acc.name, name),
                    sql`trim(lower(${acc.name})) = trim(lower(${name}))`
                )
            )
        });
    }

    if (!account) {
        const code = targetCode || `${codePrefix}-${Date.now().toString().slice(-4)}`;
        const [newAcc] = await db.insert(accounts).values({
            tenantId, name, code, type, balance: '0', isActive: true
        }).returning();
        account = newAcc;
    }
    return account;
}

export async function getVouchers() {
    try {
        const { tenantId } = await requireSession();
        return await db.query.vouchers.findMany({
            where: eq(vouchers.tenantId, tenantId),
            orderBy: [desc(vouchers.createdAt)],
            with: { createdByUser: true, account: true, customer: true, supplier: true }
        }) || [];
    } catch (e) {
        return [];
    }
}

export async function getVoucherById(id: number) {
    try {
        const { tenantId } = await requireSession();
        return await db.query.vouchers.findFirst({
            where: and(eq(vouchers.id, id), eq(accounts.tenantId, tenantId)),
            with: { createdByUser: true, account: true, customer: true, supplier: true }
        });
    } catch (e) {
        return null;
    }
}

export async function deleteVoucher(id: number) {
    const dict = await getVoucherDict();
    try {
        const { tenantId } = await requireSession();
        const voucher = await db.query.vouchers.findFirst({
            where: (v, { eq, and }) => and(eq(v.id, id), eq(v.tenantId, tenantId))
        });

        if (!voucher) {
            throw new Error(dict.Vouchers?.Messages?.NotFound);
        }

        const je = await db.query.journalEntries.findFirst({
            where: and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.reference, voucher.voucherNumber))
        });

        db.transaction((tx) => {
            if (je) {
                // deleteJournalEntry logic (Manual sync as it's better-sqlite3)
                tx.delete(journalLines).where(eq(journalLines.journalEntryId, je.id)).run();
                tx.delete(journalEntries).where(eq(journalEntries.id, je.id)).run();
            }

            tx.delete(vouchers).where(and(eq(vouchers.id, id), eq(vouchers.tenantId, tenantId))).run();
        });

        return { success: true, message: dict.Vouchers?.Messages?.DeleteSuccess };
    } catch (e: any) {
        return { success: false, error: dict.Vouchers?.Errors?.DeleteFailed || e.message };
    }
}
