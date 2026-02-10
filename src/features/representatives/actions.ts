"use server";

import { db, withErrorHandling } from "@/db";
import { representatives, invoices, accounts } from "@/db/schema";
import { desc, eq, and, like, sql, or, gte, lte } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { getDictionary } from "@/lib/i18n-server";

export async function getRepresentatives(
    page: number = 1,
    limit: number = 10,
    search?: string,
    type?: string
) {
    try {
        const { tenantId } = await requireSession();
        const offset = (page - 1) * limit;
        const conditions = [eq(representatives.tenantId, tenantId)];
        if (search) conditions.push(like(representatives.name, `%${search}%`));
        if (type && type !== 'all') conditions.push(eq(representatives.type, type));

        const data = await db.select().from(representatives).where(and(...conditions)).limit(limit).offset(offset).orderBy(desc(representatives.createdAt));
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(representatives).where(and(...conditions));
        return {
            representatives: data,
            totalPages: Math.ceil((countResult[0]?.count || 0) / limit),
            totalCount: countResult[0]?.count || 0,
            currentPage: page,
        };
    } catch (error: any) {
        return { representatives: [], totalPages: 0, totalCount: 0, currentPage: page };
    }
}

export async function createRepresentative(data: any) {
    return await withErrorHandling("createRepresentative", async () => {
        const { tenantId } = await requireSession();
        await db.insert(representatives).values({ ...data, tenantId });
        return true;
    });
}

export async function updateRepresentative(id: number, data: any) {
    return await withErrorHandling("updateRepresentative", async () => {
        const { tenantId } = await requireSession();
        await db.update(representatives).set(data).where(and(eq(representatives.id, id), eq(representatives.tenantId, tenantId)));
        return true;
    });
}

export async function deleteRepresentative(id: number) {
    return await withErrorHandling("deleteRepresentative", async () => {
        const { tenantId } = await requireSession();
        await db.delete(representatives).where(and(eq(representatives.id, id), eq(representatives.tenantId, tenantId)));
        return true;
    });
}

export async function getAllRepresentatives() {
    try {
        const { tenantId } = await requireSession();
        return await db.select().from(representatives)
            .where(and(eq(representatives.tenantId, tenantId), eq(representatives.isActive, true)))
            .orderBy(representatives.name);
    } catch (error) {
        return [];
    }
}

export async function getRepresentativeReport(id: number, startDate: string, endDate: string) {
    const result = await withErrorHandling("getRepresentativeReport", async () => {
        const { tenantId } = await requireSession();
        const representative = await db.select().from(representatives).where(and(eq(representatives.id, id), eq(representatives.tenantId, tenantId))).limit(1);
        if (!representative[0]) throw new Error("Representative not found");

        const repInvoices = await db.select().from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                eq(invoices.representativeId, id),
                gte(invoices.issueDate, startDate),
                lte(invoices.issueDate, endDate)
            ))
            .orderBy(desc(invoices.issueDate));

        const representativeObj = representative[0];
        const salary = Number(representativeObj.salary || 0);
        const commissionRate = Number(representativeObj.commissionRate || 0);
        const commissionType = representativeObj.commissionType || 'percentage';
        const commissionBasis = (representativeObj as any).commissionBasis || 'sale';

        let totalSales = 0;
        let totalCollected = 0;

        repInvoices.forEach(inv => {
            totalSales += Number(inv.totalAmount || 0);
            totalCollected += Number(inv.amountPaid || 0);
        });

        const commissionOnSales = commissionType === 'percentage'
            ? totalSales * (commissionRate / 100)
            : repInvoices.length * commissionRate;

        const commissionOnCollection = commissionType === 'percentage'
            ? totalCollected * (commissionRate / 100)
            : repInvoices.length * commissionRate;

        let totalCommission = 0;
        if (commissionBasis === 'sale') totalCommission = commissionOnSales;
        else if (commissionBasis === 'collection') totalCommission = commissionOnCollection;
        else if (commissionBasis === 'both') totalCommission = commissionOnSales + commissionOnCollection;

        return {
            representative: representativeObj,
            invoices: repInvoices,
            summary: {
                totalSales,
                totalCollected,
                invoicesCount: repInvoices.length,
                salary,
                commissionRate,
                commissionType,
                commissionBasis,
                commissionOnSales,
                commissionOnCollection,
                totalCommission,
                totalDue: salary + totalCommission
            }
        };
    });
    return result.success ? result.data : null;
}

export async function payRepresentativeCommission(data: any) {
    const dict = await getDictionary();
    return await withErrorHandling("payRepresentativeCommission", async () => {
        const { tenantId } = await requireSession();
        const { representativeId, amount, notes, period } = data;

        const rep = await db.query.representatives.findFirst({
            where: and(eq(representatives.id, representativeId), eq(representatives.tenantId, tenantId))
        });
        if (!rep) throw new Error(dict.Common?.Errors?.NotFound || "Not Found");

        // 1. Get Accounts (Cash Account by Code 101)
        const cashAcc = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '101%'))
        });

        if (!cashAcc) throw new Error(dict.Accounting?.Errors?.NoCashAccount || "Cash account not found");

        // 2. Find/Create Commission Expense Account (Code 501 / 5xx)
        const { getOrCreateSpecificAccount } = await import("../vouchers/actions");
        const expenseAcc = await getOrCreateSpecificAccount(tenantId, dict.Accounting?.System?.CommissionDefault || "Commission Expense", "501005", "expense");

        // 3. Create Journal Entry
        const ref = `COMM-${representativeId}-${Date.now().toString().slice(-4)}`;
        const { createJournalEntry } = await import("@/features/accounting/actions");

        await createJournalEntry({
            date: new Date().toISOString().split('T')[0],
            description: `${dict.Representatives?.Settlement || 'Settlement'}: ${rep.name} - ${period}`,
            reference: ref,
            lines: [
                { accountId: expenseAcc.id, debit: Number(amount), credit: 0, description: dict.Representatives?.CommissionDue || "Commission Due" },
                { accountId: cashAcc.id, debit: 0, credit: Number(amount), description: dict.Representatives?.PaymentToRep || "Payment to Representative" }
            ]
        });

        return { success: true, message: dict.Common?.Success || "Success" };
    });
}
