import { db } from "@/db";
import * as schema from "@/db/schema";
import { requireSession } from "@/lib/tenant-security";

export async function factoryReset() {
    try {
        const { eq, inArray } = await import("drizzle-orm");
        const { tenantId } = await requireSession();

        // Perform everything in a transaction to ensure atomicity
        await db.transaction(async (tx) => {
            // 1. Get IDs for dependent items
            const journalEntriesList = await tx.select({ id: schema.journalEntries.id }).from(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
            const journalIds = journalEntriesList.map(j => j.id);

            const invoicesList = await tx.select({ id: schema.invoices.id }).from(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
            const invoiceIds = invoicesList.map(i => i.id);

            const purchasesList = await tx.select({ id: schema.purchaseInvoices.id }).from(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
            const purchaseIds = purchasesList.map(p => p.id);

            // 2. Delete child items first
            if (journalIds.length > 0) {
                await tx.delete(schema.journalLines).where(inArray(schema.journalLines.journalEntryId, journalIds));
            }
            if (invoiceIds.length > 0) {
                await tx.delete(schema.invoiceItems).where(inArray(schema.invoiceItems.invoiceId, invoiceIds));
            }
            if (purchaseIds.length > 0) {
                await tx.delete(schema.purchaseInvoiceItems).where(inArray(schema.purchaseInvoiceItems.purchaseInvoiceId, purchaseIds));
            }

            // 3. Clear audit logs FIRST to prevent trigger issues during mass delete
            await tx.delete(schema.auditLogs).where(eq(schema.auditLogs.tenantId, tenantId));

            // 4. Clear main entities
            await tx.delete(schema.journalEntries).where(eq(schema.journalEntries.tenantId, tenantId));
            await tx.delete(schema.invoices).where(eq(schema.invoices.tenantId, tenantId));
            await tx.delete(schema.purchaseInvoices).where(eq(schema.purchaseInvoices.tenantId, tenantId));
            await tx.delete(schema.vouchers).where(eq(schema.vouchers.tenantId, tenantId));
            await tx.delete(schema.products).where(eq(schema.products.tenantId, tenantId));
            await tx.delete(schema.customers).where(eq(schema.customers.tenantId, tenantId));
            await tx.delete(schema.suppliers).where(eq(schema.suppliers.tenantId, tenantId));
            await tx.delete(schema.accounts).where(eq(schema.accounts.tenantId, tenantId));

            // Clear related shifts data as well
            await tx.delete(schema.shifts).where(eq(schema.shifts.tenantId, tenantId));
            await tx.delete(schema.installments).where(eq(schema.installments.tenantId, tenantId));
        });

        return { success: true };
    } catch (error: any) {
        console.error("Factory Reset Error:", error);
        return { success: false, error: error.message || "Failed to reset data" };
    }
}
