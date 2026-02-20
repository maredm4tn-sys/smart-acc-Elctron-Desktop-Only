import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSession } from "@/lib/tenant-security";

export async function factoryReset() {
    try {
        const { eq, inArray } = await import("drizzle-orm");
        const { tenantId } = await requireSession();

        // Perform everything in a transaction to ensure atomicity
        // 1. Fetch data asynchronously outside the transaction
        const journalEntriesList = await db.select({ id: schema.journalEntries.id }).from(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
        const journalIds = journalEntriesList.map(j => j.id);

        const invoicesList = await db.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
        const invoiceIds = invoicesList.map(i => i.id);

        const purchasesList = await db.select({ id: schema.purchaseInvoices.id }).from(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
        const purchaseIds = purchasesList.map(p => p.id);

        // 2. Perform everything in a synchronous transaction
        db.transaction((tx) => {
            // Delete child items first
            if (journalIds.length > 0) {
                tx.delete(schema.journalLines).where(inArray(schema.journalLines.journalEntryId, journalIds)).run();
            }
            if (invoiceIds.length > 0) {
                tx.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invoiceIds)).run();
            }
            if (purchaseIds.length > 0) {
                tx.delete(schema.purchaseInvoiceItems).where(inArray(schema.purchaseInvoiceItems.purchaseInvoiceId, purchaseIds)).run();
            }

            // Clear audit logs FIRST
            tx.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantId)).run();

            // Clear main entities
            tx.delete(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId)).run();
            tx.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId)).run();
            tx.delete(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId)).run();
            tx.delete(schema.vouchers).where(eq(schema.vouchers.tenantId, tenantId)).run();
            tx.delete(schema.products).where(eq(schema.products.tenantId, tenantId)).run();
            tx.delete(schema.customers).where(eq(schema.customers.tenantId, tenantId)).run();
            tx.delete(schema.suppliers).where(eq(schema.suppliers.tenantId, tenantId)).run();
            tx.delete(schema.accounts).where(eq(schema.accounts.tenantId, tenantId)).run();

            tx.delete(schema.shifts).where(eq(schema.shifts.tenantId, tenantId)).run();
            tx.delete(schema.installments).where(eq(schema.installments.tenantId, tenantId)).run();

            tx.delete(schema.partnerTransactions).where(eq(schema.partnerTransactions.tenantId, tenantId)).run();
            tx.delete(schema.partners).where(eq(schema.partners.tenantId, tenantId)).run();
        });

        return { success: true };
    } catch (error: any) {
        console.error("Factory Reset Error:", error);
        return { success: false, error: error.message  };
    }
}
