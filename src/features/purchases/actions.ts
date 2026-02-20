'use server';

import { db } from "@/db";
import { purchaseInvoices, purchaseInvoiceItems, products, accounts, journalEntries, journalLines, stockLevels } from "@/db/schema";
import { eq, desc, sql, and, or, like } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { getSettings } from "@/features/settings/actions";
import { createJournalEntry } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";

// Standardized Account Codes
const ACCOUNTS = {
    CASH: { code: '1101', type: 'asset', dictKey: 'MainCash' },
    BANK: { code: '1102', type: 'asset', dictKey: 'Bank' },
    INVENTORY: { code: '1104', type: 'asset', dictKey: 'Inventory' },
    VAT: { code: '2102', type: 'liability', dictKey: 'VatTax' },
    COGS: { code: '5101', type: 'expense', dictKey: 'COGS' },
    PURCHASES: { code: '5102', type: 'expense', dictKey: 'PurchasesCost' }, // Periodic only
    SALES: { code: '4101', type: 'revenue', dictKey: 'SalesRevenue' },
    SUPPLIERS: { code: '2101', type: 'liability', dictKey: 'Suppliers' },
    CUSTOMERS: { code: '1103', type: 'asset', dictKey: 'Customers' }
};

// Helper: Get or Create Account
async function getOrCreateAccount(tenantId: string, template: { code: string, type: any, dictKey: string }) {
    const dict = await getDictionary();
    const localizedName = dict.Accounting.SystemAccounts[template.dictKey as keyof typeof dict.Accounting.SystemAccounts];

    let account = await db.query.accounts.findFirst({
        where: (acc, { and, eq, like, or }) => and(
            eq(acc.tenantId, tenantId),
            or(
                eq(acc.code, template.code),
                like(acc.code, `${template.code}-%`)
            )
        )
    });

    if (!account) {
        const [newAcc] = await db.insert(accounts).values({
            tenantId,
            name: localizedName,
            code: template.code,
            type: template.type,
            balance: '0',
            isActive: true
        }).returning();
        account = newAcc;
    }
    return account;
}

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
                storeId: item.storeId || 1,
            });

            if (item.productId) {
                const pId = parseInt(item.productId);
                const warehouseId = item.storeId || 1;
                const [product] = await db.select().from(products).where(eq(products.id, pId));
                if (product) {
                    const oldQty = parseFloat(product.stockQuantity || "0");
                    const newQty = parseFloat(item.quantity);
                    const oldCost = parseFloat(product.buyPrice || "0");
                    const newCost = parseFloat(item.unitCost);
                    const totalQty = oldQty + newQty;
                    let avgCost = newCost;
                    if (totalQty > 0) avgCost = ((oldQty * oldCost) + (newQty * newCost)) / totalQty;

                    // 1. Update Global Product Info
                    await db.update(products).set({
                        stockQuantity: totalQty.toString(),
                        buyPrice: avgCost.toFixed(2),
                    }).where(eq(products.id, pId));

                    // 2. Update Warehouse Stock Level
                    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

                    const existingSL = await db.select().from(stockLevels)
                        .where(and(eq(stockLevels.productId, pId), eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.tenantId, tenantId)))
                        .limit(1);

                    if (existingSL.length > 0) {
                        await db.update(stockLevels)
                            .set({ quantity: sql`${castNum(stockLevels.quantity)} + ${item.quantity}` })
                            .where(eq(stockLevels.id, existingSL[0].id));
                    } else {
                        await db.insert(stockLevels).values({
                            tenantId,
                            productId: pId,
                            warehouseId,
                            quantity: item.quantity.toString()
                        });
                    }
                }
            }
        }

        try {
            // 4. Accounting Entry (Perpetual Inventory Update)
            // Debit: Inventory (Asset) - Net Amount
            // Debit: VAT (Liability/Asset) - Tax Amount
            // Credit: Supplier (Liability) - Total Amount
            // Credit: Cash (Asset) - Paid Amount (if any)

            const inventoryAcc = await getOrCreateAccount(tenantId, ACCOUNTS.INVENTORY);
            const vatAcc = await getOrCreateAccount(tenantId, ACCOUNTS.VAT);
            // Dynamic Supplier Account (Child of Suppliers Root)
            let supplierAcc = await db.query.accounts.findFirst({
                where: and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.code, `2101-${data.supplierId}`),
                        eq(accounts.name, data.supplierName)
                    )
                )
            });

            if (!supplierAcc) {
                const { getOrCreateSpecificAccount } = await import("@/features/vouchers/actions");
                supplierAcc = await getOrCreateSpecificAccount(tenantId, data.supplierName, ACCOUNTS.SUPPLIERS.code, 'liability', data.supplierId);
            }

            const cashAcc = await getOrCreateAccount(tenantId, ACCOUNTS.CASH);

            // Calculations
            const total = parseFloat(data.totalAmount);
            const subtotal = parseFloat(data.subtotal); // Net before tax
            // Calculate Tax from difference if not explicitly provided
            // Assumes totalAmount = subtotal + tax
            const taxAmount = total - subtotal;
            const paid = parseFloat(data.amountPaid || "0");

            const lines = [];

            // 1. Inventory Check-In (Net Cost)
            if (subtotal > 0) {
                lines.push({
                    accountId: inventoryAcc.id,
                    debit: subtotal,
                    credit: 0,
                    description: `${dict.Purchases?.Journal?.InventoryIn} - ${invoice.invoiceNumber}`
                });
            }

            // 2. Input VAT (Debit)
            if (Math.abs(taxAmount) > 0.01) {
                lines.push({
                    accountId: vatAcc.id,
                    debit: taxAmount,
                    credit: 0,
                    description: `${dict.Accounting?.Journal?.InputVAT} - ${invoice.invoiceNumber}`
                });
            }

            // 3. Supplier Liability (Credit Total)
            // Even if paid immediately, we credit supplier then debit them, or just credit supplier portion.
            // Standard approach: Record full liability, then payment.
            lines.push({
                accountId: supplierAcc.id,
                debit: 0,
                credit: total,
                description: `${dict.Purchases?.Journal?.Payable} - ${invoice.invoiceNumber}`
            });

            // 4. Immediate Payment (Debit Supplier, Credit Cash)
            if (paid > 0) {
                lines.push({
                    accountId: supplierAcc.id,
                    debit: paid,
                    credit: 0,
                    description: `${dict.Purchases?.Journal?.Payment} - ${invoice.invoiceNumber}`
                });
                lines.push({
                    accountId: cashAcc.id,
                    debit: 0,
                    credit: paid,
                    description: `${dict.Purchases?.Journal?.CashOut} - ${invoice.invoiceNumber}`
                });
            }

            if (lines.length > 0) {
                await createJournalEntry({
                    date: data.issueDate,
                    description: `${dict.Purchases?.Title} #${invoice.invoiceNumber} - ${data.supplierName}`,
                    reference: invoice.invoiceNumber,
                    currency,
                    lines
                });
            }

        } catch (accErr) {
            console.error("Accounting Entry Failed:", accErr);
        }

        return { success: true, invoiceId: invoice.id };
    } catch (error: any) {
        return { success: false, error: error.message  };
    }
}

export async function createPurchaseReturnInvoice(data: {
    originalInvoiceId: number;
    returnDate: string;
    items: { productId: number; description: string; quantity: number; unitCost: number; storeId?: number; }[];
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
            const warehouseId = item.storeId || 1;
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: returnInvoice.id,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: (-item.quantity * item.unitCost).toString(),
                storeId: warehouseId,
            });

            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

            // 1. Update Global Stock
            await db.update(products)
                .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` })
                .where(eq(products.id, item.productId));

            // 2. Update Warehouse Stock
            await db.update(stockLevels)
                .set({ quantity: sql`${castNum(stockLevels.quantity)} - ${item.quantity}` })
                .where(and(
                    eq(stockLevels.productId, item.productId),
                    eq(stockLevels.warehouseId, warehouseId),
                    eq(stockLevels.tenantId, tenantId)
                ));
        }

        await db.update(purchaseInvoices)
            .set({ status: 'partially_returned' })
            .where(and(eq(purchaseInvoices.id, data.originalInvoiceId), eq(purchaseInvoices.tenantId, tenantId)));

        try {
            // Accounting: Reverse of Purchase
            // Debit: Supplier (Liability) - Total Refund Value
            // Credit: Inventory (Asset) - Net Value
            // Credit: VAT - Tax Value

            const supplierAcc = await db.query.accounts.findFirst({ where: and(eq(accounts.tenantId, tenantId), eq(accounts.name, originalInvoice.supplierName)) });
            const inventoryAcc = await getOrCreateAccount(tenantId, ACCOUNTS.INVENTORY);
            const vatAcc = await getOrCreateAccount(tenantId, ACCOUNTS.VAT);

            if (supplierAcc && inventoryAcc) {
                const totalReturn = Math.abs(parseFloat(returnInvoice.totalAmount)); // Gross
                const subtotalReturn = Math.abs(parseFloat(returnInvoice.subtotal)); // Net
                const taxReturn = totalReturn - subtotalReturn; // Tax

                const lines = []; // Accounting Lines

                // 1. Debit Supplier (Reduce Liability)
                lines.push({
                    accountId: supplierAcc.id,
                    debit: totalReturn,
                    description: `${dict.Purchases?.ReturnInvoice?.JournalRef} - ${originalInvoice.invoiceNumber}`
                });

                // 2. Credit Inventory (Reduce Stock)
                if (subtotalReturn > 0) {
                    lines.push({
                        accountId: inventoryAcc.id,
                        debit: 0,
                        credit: subtotalReturn,
                        description: `${dict.Purchases?.ReturnInvoice?.JournalRefLine} - ${originalInvoice.invoiceNumber}`
                    });
                }

                // 3. Credit Input VAT (Reverse Tax Claim)
                if (taxReturn > 0.01) {
                    lines.push({
                        accountId: vatAcc.id,
                        debit: 0,
                        credit: taxReturn,
                        description: `${dict.Accounting?.Journal?.InputVAT} - ${originalInvoice.invoiceNumber}`
                    });
                }

                if (lines.length > 0) {
                    await createJournalEntry({
                        date: data.returnDate,
                        description: `${dict.Purchases?.ReturnInvoice?.Title} #${returnInvoice.invoiceNumber}`,
                        reference: returnInvoice.invoiceNumber,
                        currency,
                        lines
                    });
                }
            }
        } catch (accErr) {
            console.error("Return Accounting Failed", accErr);
        }

        return { success: true, message: dict.Purchases?.Messages?.Success };
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
                const warehouseId = oldItem.storeId || 1;
                const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

                // Reverse Global
                await db.update(products).set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${oldItem.quantity}` }).where(eq(products.id, oldItem.productId));

                // Reverse Warehouse
                await db.update(stockLevels)
                    .set({ quantity: sql`${castNum(stockLevels.quantity)} - ${oldItem.quantity}` })
                    .where(and(
                        eq(stockLevels.productId, oldItem.productId),
                        eq(stockLevels.warehouseId, warehouseId),
                        eq(stockLevels.tenantId, tenantId)
                    ));
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
            const warehouseId = item.storeId || 1;
            await db.insert(purchaseInvoiceItems).values({
                purchaseInvoiceId: id,
                productId: item.productId ? parseInt(item.productId) : null,
                description: item.description,
                quantity: item.quantity.toString(),
                unitCost: item.unitCost.toString(),
                total: item.total.toString(),
                storeId: warehouseId
            });
            if (item.productId) {
                const pId = parseInt(item.productId);
                const [product] = await db.select().from(products).where(eq(products.id, pId));
                if (product) {
                    const totalQty = parseFloat(product.stockQuantity || "0") + parseFloat(item.quantity);
                    await db.update(products).set({ stockQuantity: totalQty.toString() }).where(eq(products.id, pId));

                    // Update Warehouse
                    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

                    const existingSL = await db.select().from(stockLevels)
                        .where(and(eq(stockLevels.productId, pId), eq(stockLevels.warehouseId, warehouseId), eq(stockLevels.tenantId, tenantId)))
                        .limit(1);

                    if (existingSL.length > 0) {
                        await db.update(stockLevels)
                            .set({ quantity: sql`${castNum(stockLevels.quantity)} + ${item.quantity}` })
                            .where(eq(stockLevels.id, existingSL[0].id));
                    } else {
                        await db.insert(stockLevels).values({
                            tenantId,
                            productId: pId,
                            warehouseId,
                            quantity: item.quantity.toString()
                        });
                    }
                }
            }
        }

        try {
            // Accounting Update: Delete Old -> Create New (Perpetual Inventory)

            // 1. Find and Delete Old Entry
            const oldJE = await db.query.journalEntries.findFirst({
                where: and(
                    eq(journalEntries.tenantId, tenantId),
                    or(
                        eq(journalEntries.reference, oldInvoice.invoiceNumber || ""),
                        eq(journalEntries.reference, data.invoiceNumber)
                    )
                )
            });
            if (oldJE) {
                const { deleteJournalEntry } = await import("@/features/accounting/actions");
                await deleteJournalEntry(oldJE.id, db);
            }

            // 2. Prepare Accounts
            const inventoryAcc = await getOrCreateAccount(tenantId, ACCOUNTS.INVENTORY);
            const vatAcc = await getOrCreateAccount(tenantId, ACCOUNTS.VAT);
            const cashAcc = await getOrCreateAccount(tenantId, ACCOUNTS.CASH);

            let supplierAcc = await db.query.accounts.findFirst({
                where: and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.code, `2101-${data.supplierId}`),
                        eq(accounts.name, data.supplierName)
                    )
                )
            });

            if (!supplierAcc) {
                const { getOrCreateSpecificAccount } = await import("@/features/vouchers/actions");
                supplierAcc = await getOrCreateSpecificAccount(tenantId, data.supplierName, ACCOUNTS.SUPPLIERS.code, 'liability', data.supplierId);
            }

            // 3. New Entry Calculations
            const total = parseFloat(data.totalAmount);
            const subtotal = parseFloat(data.subtotal);
            const taxAmount = total - subtotal;
            const paid = parseFloat(data.amountPaid || "0");
            const settings = await getSettings();
            const currency = settings?.currency || "EGP";

            const lines = [];

            // Debit Inventory (Net)
            if (subtotal > 0) {
                lines.push({
                    accountId: inventoryAcc.id,
                    debit: subtotal,
                    credit: 0,
                    description: `${dict.Purchases?.Journal?.InventoryIn} - ${data.invoiceNumber}`
                });
            }

            // Debit VAT
            if (Math.abs(taxAmount) > 0.01) {
                lines.push({
                    accountId: vatAcc.id,
                    debit: taxAmount,
                    credit: 0,
                    description: `${dict.Accounting?.Journal?.InputVAT} - ${data.invoiceNumber}`
                });
            }

            // Credit Supplier (Total Priority)
            lines.push({
                accountId: supplierAcc.id,
                debit: 0,
                credit: total,
                description: `${dict.Purchases?.Journal?.Payable} - ${data.invoiceNumber}`
            });

            // Payment Handling (Debit Supplier, Credit Cash)
            if (paid > 0) {
                lines.push({
                    accountId: supplierAcc.id,
                    debit: paid,
                    credit: 0,
                    description: `${dict.Purchases?.Journal?.Payment} - ${data.invoiceNumber}`
                });
                lines.push({
                    accountId: cashAcc.id,
                    debit: 0,
                    credit: paid,
                    description: `${dict.Purchases?.Journal?.CashOut} - ${data.invoiceNumber}`
                });
            }

            if (lines.length > 0) {
                await createJournalEntry({
                    date: data.issueDate,
                    description: `${dict.Purchases?.Journal?.EditPrefix} #${data.invoiceNumber}`,
                    reference: data.invoiceNumber,
                    currency,
                    lines
                });
            }

        } catch (accErr) {
            console.error("Accounting Update Failed:", accErr);
        }

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
        if (!invoice) return { success: false, error: dict.Common?.Error };

        await db.transaction(async (tx) => {
            for (const item of invoice.items) {
                if (item.productId) {
                    const warehouseId = item.storeId || 1;
                    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

                    // Reduce Global
                    await tx.update(products).set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` }).where(eq(products.id, item.productId));

                    // Reduce Warehouse
                    await tx.update(stockLevels)
                        .set({ quantity: sql`${castNum(stockLevels.quantity)} - ${item.quantity}` })
                        .where(and(
                            eq(stockLevels.productId, item.productId),
                            eq(stockLevels.warehouseId, warehouseId),
                            eq(stockLevels.tenantId, tenantId)
                        ));
                }
            }
            const relatedJEs = await tx.query.journalEntries.findMany({ where: and(eq(journalEntries.tenantId, tenantId), or(eq(journalEntries.reference, invoice.invoiceNumber), like(journalEntries.reference, `%${invoice.invoiceNumber}%`))) });
            const { deleteJournalEntry } = await import("@/features/accounting/actions");
            for (const je of relatedJEs) await deleteJournalEntry(je.id, tx);
            await tx.delete(purchaseInvoiceItems).where(eq(purchaseInvoiceItems.purchaseInvoiceId, id));
            await tx.delete(purchaseInvoices).where(and(eq(purchaseInvoices.id, id), eq(purchaseInvoices.tenantId, tenantId)));
        });
        return { success: true, message: dict.Common?.Success };
    } catch (e: any) {
        return { success: false, error: e.message || "Error" };
    }
}