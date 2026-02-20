"use server";

import { db } from "@/db";
import { installments, invoices, accounts, customers } from "@/db/schema";
import { eq, and, sql, desc, asc, like } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { createJournalEntry } from "@/features/accounting/actions";

export async function getInstallments(filters?: { customerId?: number, status?: string, thisMonth?: boolean }) {
    try {
        const { tenantId } = await requireSession();

        const query = db.select({
            id: installments.id,
            dueDate: installments.dueDate,
            amount: installments.amount,
            amountPaid: installments.amountPaid,
            status: installments.status,
            paidDate: installments.paidDate,
            notes: installments.notes,
            invoiceId: installments.invoiceId,
            customerName: customers.name,
            invoiceNumber: invoices.invoiceNumber,
            installmentCount: invoices.installmentCount,
            installmentInterest: invoices.installmentInterest,
        })
            .from(installments)
            .innerJoin(customers, eq(installments.customerId, customers.id))
            .innerJoin(invoices, eq(installments.invoiceId, invoices.id))
            .where(eq(installments.tenantId, tenantId))
            .orderBy(asc(installments.dueDate), asc(customers.name));

        return await query;
    } catch (e) {
        console.error("Error fetching installments:", e);
        return [];
    }
}

export async function payInstallment(id: number, paymentDate: string) {
    try {
        const { tenantId, userId } = await requireSession();

        // 1. Pre-fetch needed data outside the transaction
        const inst = await db.query.installments.findFirst({
            where: and(eq(installments.id, id), eq(installments.tenantId, tenantId)),
            with: {
                invoice: true,
                customer: true
            }
        });

        if (!inst || inst.status === 'paid') {
            return { success: false, message: "Installment not found or already paid" };
        }

        const cashAccount = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '1101%'))
        });

        const arAccount = await db.query.accounts.findFirst({
            where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '1103%'))
        });

        const amount = Number(inst.amount);

        // 2. Perform DB updates in a TRANSACTION (Note: sync is safer for better-sqlite3)
        db.transaction((tx) => {
            tx.update(installments).set({
                status: 'paid',
                amountPaid: inst.amount,
                paidDate: paymentDate,
            }).where(and(eq(installments.id, id), eq(installments.tenantId, tenantId)));

            const currentInvoicePaid = Number(inst.invoice?.amountPaid || 0);
            const newInvoicePaid = currentInvoicePaid + amount;

            tx.update(invoices).set({
                amountPaid: newInvoicePaid.toFixed(2),
            }).where(and(eq(invoices.id, inst.invoiceId), eq(invoices.tenantId, tenantId)));
        });

        // 3. Create Journal Entry (Outside transaction to allow async)
        if (cashAccount && arAccount) {
            await createJournalEntry({
                date: paymentDate,
                reference: `INST-${inst.id}`,
                description: `تحصيل قسط - ${inst.customer?.name} - فاتورة ${inst.invoice?.invoiceNumber}`,
                lines: [
                    { accountId: cashAccount.id, debit: amount, credit: 0, description: `سداد قسط - ${inst.customer?.name}` },
                    { accountId: arAccount.id, debit: 0, credit: amount, description: `تسوية رصيد عميل` }
                ]
            });
        }

        return { success: true, message: "Operation successful" };
    } catch (e: any) {
        console.error("Error paying installment:", e);
        return { success: false, message: e.message || "Error" };
    }
}
