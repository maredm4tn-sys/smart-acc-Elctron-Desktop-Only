'use server';

import { db } from "@/db";
import { purchaseInvoices, purchaseInvoiceItems, products, accounts, journalEntries, journalLines } from "@/db/schema";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { getSettings } from "@/features/settings/actions";
import { createJournalEntry } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";

export async function getPurchaseInvoices() {
    try {
        const { tenantId } = await requireSession();
        return await db.query.purchaseInvoices.findMany({
            where: eq(purchaseInvoices.tenantId, tenantId),
            orderBy: [desc(purchaseInvoices.issueDate)],
            with: { supplier: true, items: true }
        });
    } catch (e) {
        return [];
    }
}

export async function getPurchaseInvoiceById(id: number) {
    try {
        const { tenantId } = await requireSession();
        return await db.query.purchaseInvoices.findFirst({
            where: and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)),
            with: { items: true }
        });
    } catch (e) {
        return null;
    }
}

export async function createPurchaseInvoice(data: any) {
    const dict = await getDictionary();
    try {
        const { tenantId, userId } = await requireSession();
        const formattedDate = data.issueDate.includes('T') ? data.issueDate.split('T')[0] : data.issueDate;
        const settings = await getSettings();
        const currency = settings?.currency || "EGP";

        const [invoice] = await db.insert(purchaseInvoices).values({
            tenantId,
            supplierId: data.supplierId ? parseInt(data.supplierId) : null,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber || `PUR-${Date.now().toString().slice(-6)}`,
            issueDate: formattedDate,
            paymentStatus: data.paymentStatus || 'unpaid',
            amountPaid: Number(data.amountPaid || 0).toFixed(2),
            status: 'posted',
            totalAmount: Number(data.totalAmount).toFixed(2),
            subtotal: Number(data.subtotal).toFixed(2),
            currency,
            createdBy: userId,
        }).returning();

        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: invoice.id,
                productId: item.productId ? parseInt(item.productId) : null,
                description: item.description,
                quantity: Number(item.quantity).toFixed(2),
                unitCost: Number(item.unitCost).toFixed(2),
                total: Number(item.total).toFixed(2),
            });

            if (item.productId) {
                const pId = parseInt(item.productId);
                const [product] = await db.select().from(products).where(eq(products.id, pId));
                if (product) {
                    const oldQty = parseFloat(product.stockQuantity || "0");
                    const newQty = parseFloat(item.quantity);
                    const oldCost = parseFloat(product.buyPrice || "0");
                    const newCost = parseFloat(item.unitCost);
                    const totalQty = oldQty + newQty;
                    let avgCost = newCost;
                    if (totalQty > 0) avgCost = ((oldQty * oldCost) + (newQty * newCost)) / totalQty;
                    await db.update(products).set({
                        stockQuantity: totalQty.toString(),
                        buyPrice: avgCost.toFixed(2),
                    }).where(eq(products.id, pId));
                }
            }
        }

        try {
            // Find Purchase Account by Code (501)
            let purchaseAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '501%'))
            });
            if (!purchaseAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId,
                    name: dict.Accounting?.System?.PurchaseDefault || "Purchases",
                    code: "501001",
                    type: 'expense',
                    balance: '0'
                }).returning();
                purchaseAcc = newAcc;
            }

            // Find Supplier Account by Name (Dynamic)
            let supplierAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.name, data.supplierName))
            });
            if (!supplierAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId,
                    name: data.supplierName,
                    code: `210-${Date.now().toString().slice(-4)}`,
                    type: 'liability',
                    balance: '0'
                }).returning();
                supplierAcc = newAcc;
            }

            // Find Cash Account by Code (101)
            const cashAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '101%'))
            });

            const total = parseFloat(data.totalAmount);
            const paid = parseFloat(data.amountPaid || "0");
            const lines = [];

            lines.push({ accountId: purchaseAcc.id, debit: total, credit: 0, description: `${dict.Purchases?.Journal?.InventoryIn || "Inventory Purchase"} - ${invoice.invoiceNumber}` });
            lines.push({ accountId: supplierAcc.id, debit: 0, credit: total, description: `${dict.Purchases?.Journal?.Payable || "Accounts Payable"} - ${invoice.invoiceNumber}` });

            if (paid > 0 && cashAcc) {
                lines.push({ accountId: supplierAcc.id, debit: paid, credit: 0, description: `${dict.Purchases?.Journal?.Payment || "Payment"} - ${invoice.invoiceNumber}` });
                lines.push({ accountId: cashAcc.id, debit: 0, credit: paid, description: `${dict.Purchases?.Journal?.CashOut || "Cash Out"} - ${invoice.invoiceNumber}` });
            }

            await createJournalEntry({
                date: data.issueDate,
                description: `${dict.Purchases?.Title || 'Purchase'} #${invoice.invoiceNumber} - ${data.supplierName}`,
                reference: invoice.invoiceNumber,
                currency,
                lines
            });
        } catch (accErr) {
            console.error("Accounting Entry Failed:", accErr);
        }

        return { success: true, invoiceId: invoice.id };
    } catch (error: any) {
        return { success: false, error: error.message || "Unknown error" };
    }
}

export async function createPurchaseReturnInvoice(data: {
    originalInvoiceId: number;
    returnDate: string;
    items: { productId: number; description: string; quantity: number; unitCost: number; }[];
}) {
    const dict = await getDictionary();
    try {
        const { tenantId, userId } = await requireSession();
        const originalInvoice = await db.query.purchaseInvoices.findFirst({
            where: and(eq(purchaseInvoices.id, data.originalInvoiceId), eq(purchaseInvoices.tenantId, tenantId))
        });

        if (!originalInvoice) throw new Error("Original Invoice not found");

        let subtotal = 0;
        data.items.forEach(item => { subtotal += item.quantity * item.unitCost; });

        const settings = await getSettings();
        const currency = settings?.currency || "EGP";

        const [returnInvoice] = await db.insert(purchaseInvoices).values({
            tenantId,
            supplierId: originalInvoice.supplierId,
            supplierName: originalInvoice.supplierName,
            invoiceNumber: `RET-${originalInvoice.invoiceNumber}-${Date.now().toString().slice(-4)}`,
            issueDate: data.returnDate,
            paymentStatus: 'paid',
            amountPaid: (-subtotal).toString(),
            status: 'posted',
            type: 'return',
            relatedInvoiceId: originalInvoice.id,
            totalAmount: (-subtotal).toString(),
            subtotal: (-subtotal).toString(),
            currency,
            createdBy: userId,
        }).returning();

        if (!returnInvoice) throw new Error("Failed to create return");

        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: returnInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: (-item.quantity * item.unitCost).toString(),
            });

            const castNum = (col: any) => sql`CAST(${col} AS REAL)`;
            await db.update(products)
                .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` })
                .where(eq(products.id, item.productId));
        }

        await db.update(purchaseInvoices)
            .set({ status: 'partially_returned' })
            .where(and(eq(purchaseInvoices.id, data.originalInvoiceId), eq(purchaseInvoices.tenantId, tenantId)));

        try {
            const supplierAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), eq(accounts.name, originalInvoice.supplierName)) });
            const purchaseAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '501%')) });

            if (supplierAcc && purchaseAcc) {
                const totalReturn = Math.abs(subtotal);
                await createJournalEntry({
                    date: data.returnDate,
                    description: `${dict.Purchases?.Returns?.Title || 'Return'} #${originalInvoice.invoiceNumber}`,
                    reference: returnInvoice.invoiceNumber,
                    currency,
                    lines: [
                        { accountId: supplierAcc.id, debit: totalReturn, credit: 0, description: `${dict.Purchases?.Returns?.JournalRef || 'Purchase Return'} - ${originalInvoice.invoiceNumber}` },
                        { accountId: purchaseAcc.id, debit: 0, credit: totalReturn, description: `${dict.Purchases?.Returns?.JournalRefLine || 'Cost Reduction'} - ${originalInvoice.invoiceNumber}` }
                    ]
                });
            }
        } catch (accErr) { }

        return { success: true, message: dict.Purchases?.Returns?.Success || "Success" };
    } catch (e: any) {
        return { success: false, error: e.message || "Error" };
    }
}

export async function updatePurchaseInvoice(id: number, data: any) {
    const dict = await getDictionary();
    try {
        const { tenantId, userId } = await requireSession();
        const oldInvoice = await db.query.purchaseInvoices.findFirst({ where: and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)), with: { items: true } });
        if (!oldInvoice) throw new Error("Invoice not found");

        for (const oldItem of oldInvoice.items) {
            if (oldItem.productId) {
                await db.update(products).set({ stockQuantity: sql`CAST(${products.stockQuantity} AS REAL) - ${oldItem.quantity}` }).where(eq(products.id, oldItem.productId));
            }
        }

        await db.update(purchaseInvoices).set({
            supplierId: data.supplierId ? parseInt(data.supplierId) : null,
            supplierName: data.supplierName,
            invoiceNumber: data.invoiceNumber || oldInvoice.invoiceNumber,
            issueDate: data.issueDate,
            paymentStatus: data.paymentStatus || 'unpaid',
            amountPaid: (data.amountPaid || 0).toString(),
            totalAmount: data.totalAmount.toString(),
            subtotal: data.subtotal.toString(),
        }).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));

        await db.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, id));

        for (const item of data.items) {
            await db.insert(purchaseInvoiceItems).values({ purchaseInvoiceId: id, productId: item.productId ? parseInt(item.productId) : null, description: item.description, quantity: item.quantity.toString(), unitCost: item.unitCost.toString(), total: item.total.toString() });
            if (item.productId) {
                const pId = parseInt(item.productId);
                const [product] = await db.select().from(products).where(eq(products.id, pId));
                if (product) {
                    const totalQty = parseFloat(product.stockQuantity || "0") + parseFloat(item.quantity);
                    await db.update(products).set({ stockQuantity: totalQty.toString() }).where(eq(products.id, pId));
                }
            }
        }

        try {
            const oldJE = await db.query.journalEntries.findFirst({ where: and(eq(journalEntries.tenantId, tenantId), eq(journalEntries.reference, oldInvoice.invoiceNumber || "")) });
            if (oldJE) {
                const { deleteJournalEntry } = await import("@/features/accounting/actions");
                await deleteJournalEntry(oldJE.id, db);
            }

            const purchaseAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '501%')) });
            const supplierAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), eq(accounts.name, data.supplierName)) });
            const cashAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), like(accounts.code, '101%')) });

            const total = parseFloat(data.totalAmount);
            const paid = parseFloat(data.amountPaid || "0");
            const settings = await getSettings();

            await createJournalEntry({
                date: data.issueDate,
                description: `${dict.Purchases?.Journal?.EditPrefix || 'Updated Purchase'} #${data.invoiceNumber}`,
                reference: data.invoiceNumber,
                currency: settings?.currency || "EGP",
                lines: [
                    { accountId: purchaseAcc?.id, debit: total, credit: 0, description: `Purchase update` },
                    { accountId: supplierAcc?.id, debit: 0, credit: total, description: `Payable update` }
                ]
            });
        } catch (accErr) { }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message || "Error" };
    }
}

export async function deletePurchaseInvoice(id: number) {
    const dict = await getDictionary();
    try {
        const { tenantId } = await requireSession();
        const invoice = await db.query.purchaseInvoices.findFirst({ where: (inv, { eq, and }) => and(eq(inv.id, id), eq(inv.tenantId, tenantId)), with: { items: true } });
        if (!invoice) return { success: false, error: dict.Common?.Error || "Error" };

        await db.transaction(async (tx) => {
            for (const item of invoice.items) {
                if (item.productId) await tx.update(products).set({ stockQuantity: sql`CAST(${products.stockQuantity} AS REAL) - ${item.quantity}` }).where(eq(products.id, item.productId));
            }
            const relatedJEs = await tx.query.journalEntries.findMany({ where: and(eq(journalEntries.tenantId, tenantId), or(eq(journalEntries.reference, invoice.invoiceNumber), like(journalEntries.reference, `%${invoice.invoiceNumber}%`))) });
            const { deleteJournalEntry } = await import("@/features/accounting/actions");
            for (const je of relatedJEs) await deleteJournalEntry(je.id, tx);
            await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, id));
            await tx.delete(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
        });
        return { success: true, message: dict.Common?.Success || "Success" };
    } catch (e: any) {
        return { success: false, error: e.message || "Error" };
    }
}