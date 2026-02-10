"use server";

import { db } from "@/db";
import { purchaseInvoices, journalEntries, accounts } from "@/db/schema";
import { eq, and, or, like } from "drizzle-orm";
import { createJournalEntry } from "@/features/accounting/actions";

/**
 * Repairs missing journal entries for ALL purchase invoices.
 * Useful for migrating legacy data or fixing synchronization issues.
 */
export async function syncAllPurchasesToLedger() {
    try {
        const invoices = await db.select().from(purchaseInvoices);

        let fixedCount = 0;
        let skippedCount = 0;

        for (const invoice of invoices) {
            // Check if JE already exists for this invoice reference
            const [existingJE] = await db.select()
                .from(journalEntries)
                .where(and(
                    eq(journalEntries.tenantId, invoice.tenantId),
                    eq(journalEntries.reference, invoice.invoiceNumber || "")
                ))
                .limit(1);

            if (existingJE) {
                skippedCount++;
                continue;
            }

            // 1. Find or Create Purchases Account (Code starting with 5)
            const [purchaseAccFirst] = await db.select().from(accounts)
                .where(and(eq(accounts.tenantId, invoice.tenantId), or(like(accounts.code, '5%'), like(accounts.name, '%Purchase%'))))
                .limit(1);

            let purchaseAcc = purchaseAccFirst;
            if (!purchaseAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: invoice.tenantId,
                    name: "Purchases (Auto-created)",
                    code: `501-${Date.now().toString().slice(-4)}`,
                    type: 'expense',
                    balance: '0'
                }).returning();
                purchaseAcc = newAcc;
            }

            // 2. Find or Create Supplier Account
            const [supplierAccFirst] = await db.select().from(accounts)
                .where(and(eq(accounts.tenantId, invoice.tenantId), eq(accounts.name, invoice.supplierName)))
                .limit(1);

            let supplierAcc = supplierAccFirst;
            if (!supplierAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId: invoice.tenantId,
                    name: invoice.supplierName,
                    code: `210-${Date.now().toString().slice(-4)}`,
                    type: 'liability',
                    balance: '0'
                }).returning();
                supplierAcc = newAcc;
            }

            // 3. Find Cash Account
            const [cashAcc] = await db.select().from(accounts)
                .where(and(eq(accounts.tenantId, invoice.tenantId), or(like(accounts.code, '101%'), like(accounts.name, '%Cash%'), like(accounts.name, '%Treasury%'))))
                .limit(1);

            const total = parseFloat(invoice.totalAmount || "0");
            const paid = parseFloat(invoice.amountPaid || "0");
            const lines = [];

            if (total > 0) {
                lines.push({ accountId: purchaseAcc.id, debit: total, credit: 0, description: `System: Purchase Sync - Inv ${invoice.invoiceNumber}` });
                lines.push({ accountId: supplierAcc.id, debit: 0, credit: total, description: `System: Liability Sync - Inv ${invoice.invoiceNumber}` });
            }

            if (paid > 0 && cashAcc) {
                lines.push({ accountId: supplierAcc.id, debit: paid, credit: 0, description: `System: Payment Sync - Inv ${invoice.invoiceNumber}` });
                lines.push({ accountId: cashAcc.id, debit: 0, credit: paid, description: `System: Cash Payment Sync` });
            }

            if (lines.length > 0) {
                await createJournalEntry({
                    date: invoice.issueDate,
                    description: `Auto-Sync: Inv ${invoice.invoiceNumber} - ${invoice.supplierName}`,
                    reference: invoice.invoiceNumber,
                    lines: lines
                });
                fixedCount++;
            }
        }

        return { success: true, fixedCount, skippedCount };
    } catch (e: any) {
        console.error("Sync Error:", e);
        const errorMessage = e.message || "An unexpected error occurred during synchronization.";
        return { success: false, error: errorMessage };
    }
}
