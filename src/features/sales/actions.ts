"use server";

import { db } from "@/db";
import { invoices, invoiceItems, products, journalEntries, journalLines, accounts, installments, customers, tenants } from "@/db/schema";
import { eq, and, sql, or, like, desc, inArray, isNotNull } from "drizzle-orm";
// import { revalidatePath } from "next/cache";
import { getSession } from "@/features/auth/actions";
import { getSettings } from "@/features/settings/actions";
// import { getTauriSession } from "@/lib/tauri-utils"; // REMOVED
import { getDictionary } from "@/lib/i18n-server";
import { createJournalEntry } from "@/features/accounting/actions";
import { getActiveShift } from "@/features/shifts/actions";
import { z } from "zod";

// Helper to get or create accounts (Duplicate from vouchers to avoid circular deps in actions)
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

async function requireSession() {
    const session = await getSession();
    if (!session?.tenantId || !session?.userId) {
        throw new Error("Unauthorized: Please login again.");
    }
    return {
        tenantId: session.tenantId,
        userId: session.userId
    };
}

type CreateInvoiceInput = {
    customerName: string;
    customerId?: number | null; // Added
    issueDate: string;
    dueDate?: string;
    currency: string;
    exchangeRate: number;
    includeTax: boolean;
    representativeId?: number | null;
    items: {
        productId: number;
        description: string;
        quantity: number;
        unitPrice: number;
        unitId?: number | null; // Added
        storeId?: number | null; // Added
        discount?: number; // Added
    }[];
    discountAmount?: number;
    discountPercent?: number; // Added
    deliveryFee?: number; // Added
    paymentMethod?: string;
    tenantId?: string;
    // POS Fields
    priceType?: string; // Added
    storeId?: number; // Added

    // Installment Fields
    isInstallment?: boolean;
    installmentCount?: number;
    installmentInterest?: number;
};

const createInvoiceSchema = z.object({
    customerName: z.string().min(1, "Customer Name is required"),
    customerId: z.any().nullable().optional(),
    issueDate: z.any().optional(),
    dueDate: z.any().optional(),
    currency: z.string().optional().default("EGP"),
    exchangeRate: z.any().optional().default(1),
    includeTax: z.any().optional().default(false),
    items: z.array(z.any()).min(0).optional().default([]),
    discountAmount: z.any().optional().default(0),
    discountPercent: z.any().optional().default(0),
    deliveryFee: z.any().optional().default(0),
    paymentMethod: z.string().optional().default("cash"),
    tenantId: z.string().optional(),
    priceType: z.string().optional().default("retail"),
    storeId: z.any().optional().default(1),
    isInstallment: z.any().optional().default(false),
    installmentCount: z.any().optional().default(0),
    installmentInterest: z.any().optional().default(0),
    representativeId: z.any().optional().nullable(),
});


export async function createInvoice(inputData: any) {
    const dict = await getDictionary();
    const data = inputData; // Bypass Zod validation totally

    try {
        const { tenantId, userId } = await requireSession();

        // --- License Check (TRIAL) ---
        const { getLicenseStatus } = await import("@/lib/license-check");
        const license = await getLicenseStatus();
        if (license.isExpired && !license.isActivated) {
            return {
                success: false as const,
                message: dict?.Common?.TrialExpired || "Trial Version Expired. Please activate the full version."
            };
        }

        // Calculate totals
        let subtotal = 0;
        data.items.forEach(item => {
            const lineTotal = (item.quantity * item.unitPrice) - (item.discount || 0);
            subtotal += lineTotal;
        });

        // Bill Level Discount
        const billDiscountAmount = data.discountAmount || 0;
        const billDiscountPercentVal = data.discountPercent ? (subtotal * data.discountPercent / 100) : 0;
        const totalDiscount = billDiscountAmount + billDiscountPercentVal;

        const netSubtotal = Math.max(0, subtotal - totalDiscount);

        // --- FETCH DYNAMIC SETTINGS ---
        const tenantSettings = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        const tenant = tenantSettings[0];

        const isTaxEnabled = tenant?.taxEnabled ?? false;
        const systemTaxRate = (tenant?.taxRate || 0) / 100;
        const taxType = tenant?.taxType || 'exclusive'; // inclusive or exclusive

        // Effective tax rate based on whether tax is enabled and requested for this invoice
        const effectiveTaxRate = (isTaxEnabled || data.includeTax) ? systemTaxRate : 0;

        let taxTotal = 0;
        let finalNetSubtotal = netSubtotal;

        if (effectiveTaxRate > 0) {
            if (taxType === 'inclusive') {
                // Formula for inclusive tax: Total / (1 + Rate) * Rate
                taxTotal = (netSubtotal / (1 + effectiveTaxRate)) * effectiveTaxRate;
                finalNetSubtotal = netSubtotal - taxTotal;
            } else {
                // Exclusive: Just add on top
                taxTotal = netSubtotal * effectiveTaxRate;
                finalNetSubtotal = netSubtotal;
            }
        }

        const delivery = data.deliveryFee || 0;
        let totalAmount = (taxType === 'inclusive') ? (netSubtotal + delivery) : (netSubtotal + taxTotal + delivery);

        // --- Installment Logic ---
        let installmentMonthlyAmount = 0;
        if (data.isInstallment && (data.installmentInterest || 0) > 0) {
            const interest = totalAmount * ((data.installmentInterest || 0) / 100);
            totalAmount += interest;
        }

        if (data.isInstallment && (data.installmentCount || 0) > 0) {
            const paidNow = data.initialPayment || 0;
            const remaining = totalAmount - paidNow;
            installmentMonthlyAmount = remaining / (data.installmentCount || 1);
        }

        // Determine Payment Status
        let paidAmount = Number(data.initialPayment || 0);

        // POS/Logic FIX: If payment method is 'cash' or 'card', and no initialPayment provided (or explicitly 0),
        // assume it's fully paid (100% of totalAmount).
        if ((data.paymentMethod === 'cash' || data.paymentMethod === 'card') && (paidAmount === 0)) {
            paidAmount = totalAmount;
        }

        let paymentStatus: 'paid' | 'unpaid' | 'partial' = 'unpaid';
        if (paidAmount >= totalAmount - 0.01) paymentStatus = 'paid';
        else if (paidAmount > 0) paymentStatus = 'partial';

        // POS Normalization: Convert Arabic/UI strings to internal keys
        if (data.paymentMethod === 'Sales.Table.Credit') data.paymentMethod = 'credit';
        if (data.paymentMethod === 'Sales.Table.Cash') data.paymentMethod = 'cash';
        if (data.paymentMethod === 'Sales.Table.Card') data.paymentMethod = 'card';
        if (data.paymentMethod === 'installment') {
            data.isInstallment = true;
            data.paymentMethod = 'credit'; // Ensure it's treated as credit for accounting
        }

        // 1. Prepare Data & Check Token Requirement
        const formattedDate = data.issueDate.includes('T') ? data.issueDate.split('T')[0] : data.issueDate;
        const formattedDueDate = data.dueDate ? (data.dueDate.includes('T') ? data.dueDate.split('T')[0] : data.dueDate) : undefined;

        // --- ROBUST INVOICE NUMBERING LOGIC ---
        const lastInvoices = await db.select({ invoiceNumber: invoices.invoiceNumber })
            .from(invoices)
            .where(eq(invoices.tenantId, tenantId))
            .orderBy(desc(invoices.id))
            .limit(1);

        let nextNumber = 1;
        if (lastInvoices.length > 0 && lastInvoices[0].invoiceNumber) {
            const lastNumStr = lastInvoices[0].invoiceNumber.replace(/[^\d]/g, '');
            if (lastNumStr) {
                nextNumber = parseInt(lastNumStr, 10) + 1;
            }
        }

        const prefix = tenant?.invoicePrefix || "INV-";
        const currentInvoiceNumber = `${prefix}${String(nextNumber).padStart(4, '0')}`;

        // Fetch involved products and rest of logic...
        const productIds = data.items.map(i => i.productId);
        const involvedProducts = await db.select({
            id: products.id,
            type: products.type,
            requiresToken: products.requiresToken,
            categoryId: products.categoryId,
            buyPrice: products.buyPrice
        })
            .from(products)
            .where(inArray(products.id, productIds));

        // Calculate Token Number if needed
        let tokenNumber: number | undefined = undefined;
        const needsToken = involvedProducts.some(p => p.requiresToken);

        if (needsToken) {
            // ... (Token Logic) ...
            const tokenItem = involvedProducts.find(p => p.requiresToken);
            const tokenCategoryId = tokenItem?.categoryId;

            if (tokenCategoryId) {
                const countResult = await db.select({ count: sql<number>`count(distinct ${invoices.id})` })
                    .from(invoices)
                    .innerJoin(invoiceItems, eq(invoices.id, invoiceItems.invoiceId))
                    .innerJoin(products, eq(invoiceItems.productId, products.id))
                    .where(
                        and(
                            eq(invoices.tenantId, tenantId),
                            eq(invoices.issueDate, formattedDate),
                            isNotNull(invoices.tokenNumber),
                            eq(products.categoryId, tokenCategoryId)
                        )
                    );
                tokenNumber = (Number(countResult[0]?.count) || 0) + 1;
            } else {
                const globalResult = await db.select({ count: sql<number>`count(*)` })
                    .from(invoices)
                    .where(and(
                        eq(invoices.tenantId, tenantId),
                        eq(invoices.issueDate, formattedDate),
                        isNotNull(invoices.tokenNumber)
                    ));
                tokenNumber = (Number(globalResult[0]?.count) || 0) + 1;
            }
        }

        // Insert Invoice
        const [newInvoice] = await db.insert(invoices).values({
            tenantId: tenantId,
            invoiceNumber: currentInvoiceNumber, // USE GENERATED NUMBER
            customerName: data.customerName,
            customerId: data.customerId,
            representativeId: data.representativeId,
            issueDate: formattedDate,
            dueDate: formattedDueDate,
            currency: data.currency || (await getSettings())?.currency || "EGP",
            exchangeRate: (data.exchangeRate || 1).toString(),
            subtotal: subtotal.toFixed(2),
            taxTotal: taxTotal.toFixed(2),
            discountAmount: totalDiscount.toFixed(2),
            discountPercent: data.discountPercent?.toString(),
            deliveryFee: (delivery || 0).toFixed(2),
            paymentMethod: data.paymentMethod || "cash",
            totalAmount: totalAmount.toFixed(2),
            amountPaid: Number(paidAmount).toFixed(2),
            paymentStatus: paymentStatus,
            status: "issued",
            priceType: data.priceType || 'retail',
            storeId: data.storeId || 1,
            tokenNumber: tokenNumber,
            createdBy: userId,
            shiftId: (await getActiveShift())?.id,
            isInstallment: !!data.isInstallment,
            installmentDownPayment: Number(data.initialPayment || 0).toFixed(2),
            installmentCount: data.installmentCount,
            installmentInterest: Number(data.installmentInterest || 0).toFixed(2),
            installmentMonthlyAmount: installmentMonthlyAmount.toFixed(2),
        }).returning();

        // Increment Next Invoice Number in Database
        await db.update(tenants)
            .set({ nextInvoiceNumber: (tenant?.nextInvoiceNumber || 1) + 1 })
            .where(eq(tenants.id, tenantId));

        // RECOVERY LOGIC...
        let invoiceId = newInvoice?.id || (newInvoice as any)?.ID || (newInvoice as any)?.["id"];

        if (!invoiceId) {
            console.warn("⚠️ [DB-FALLBACK] Returning() failed, attempting manual fetch...");
            const lastRows = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.id)).limit(1);
            invoiceId = lastRows[0]?.id;
        }

        if (!invoiceId) {
            console.error("❌ [CRITICAL] Invoice ID still missing after mapping and fallback. Result:", newInvoice);
            throw new Error("Error saving invoice: ID missing.");
        }

        // 2. Create Invoice Items & Update Stock
        for (const item of data.items) {
            await db.insert(invoiceItems).values({
                invoiceId: invoiceId,
                productId: item.productId,
                description: item.description,
                quantity: Number(item.quantity).toFixed(2),
                unitPrice: Number(item.unitPrice).toFixed(2),
                unitId: item.unitId,
                storeId: item.storeId,
                discount: (item.discount || 0).toFixed(2),
                total: ((item.quantity * item.unitPrice) - (item.discount || 0)).toFixed(2),
            });

            // Decrement Stock ONLY for 'goods'
            const pInfo = involvedProducts.find(p => p.id === item.productId);
            if (pInfo?.type === 'goods') {
                const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
                const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
                await db.update(products)
                    .set({ stockQuantity: sql`${castNum(products.stockQuantity)} - ${item.quantity}` })
                    .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
            }
        }

        // 2.1 CREATE INSTALLMENT SCHEDULE
        if (data.isInstallment && (data.installmentCount || 0) > 0) {
            // Find Customer ID by name
            const customerList = await db.select().from(customers)
                .where(and(eq(customers.name, data.customerName), eq(customers.tenantId, tenantId)))
                .limit(1);

            const customerObj = customerList[0];

            if (customerObj) {
                const count = data.installmentCount || 0;
                const startDate = new Date(formattedDate);
                // ... (rest of installment logic)

                const [year, month, day] = formattedDate.split('-').map(Number);

                for (let i = 1; i <= count; i++) {
                    // Create date using components to avoid timezone shifts
                    let d = new Date(year, (month - 1) + i, day);

                    // Handle overflow (e.g., Jan 31 -> March 3) by snapping back to last day of intended month
                    const expectedMonth = ((month - 1) + i) % 12;
                    if (d.getMonth() !== expectedMonth) {
                        d = new Date(year, (month - 1) + i + 1, 0);
                    }

                    // Manually format YYYY-MM-DD
                    const finalY = d.getFullYear();
                    const finalM = String(d.getMonth() + 1).padStart(2, '0');
                    const finalD = String(d.getDate()).padStart(2, '0');
                    const finalDueDateStr = `${finalY}-${finalM}-${finalD}`;

                    await db.insert(installments).values({
                        tenantId: tenantId,
                        customerId: customerObj.id,
                        invoiceId: invoiceId,
                        dueDate: finalDueDateStr,
                        amount: installmentMonthlyAmount.toFixed(2),
                        amountPaid: "0.00",
                        status: "unpaid",
                    });
                }
            }
        }

        // 3. Auto-Create Journal Entry
        // Find OR Create Accounts
        const cashAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '101%'), like(accounts.name, '%Cash%'), like(accounts.name, '%Treasury%'))
        )).limit(1);
        let cashAccount = cashAccountRows[0];

        if (!cashAccount) {
            console.warn("⚠️ [Inventory] Cash account missing, creating one...");
            const [newCash] = await db.insert(accounts).values({
                tenantId,
                name: `${dict.Accounting.SystemAccounts.MainCash} (Auto)`,
                code: `101-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                isActive: true
            }).returning();
            cashAccount = newCash;
        }

        const salesAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '401%'), like(accounts.name, '%Sales%'), like(accounts.name, '%Revenue%'), like(accounts.name, '%المبيعات%'), like(accounts.name, '%إيرادات%'))
        )).limit(1);
        let salesAccount = salesAccountRows[0];

        if (!salesAccount) {
            console.warn("⚠️ [Inventory] Sales account missing, creating one...");
            const [newSales] = await db.insert(accounts).values({
                tenantId,
                name: `${dict.Accounting.SystemAccounts.SalesRevenue} (Auto)`,
                code: `401-${Date.now().toString().slice(-4)}`,
                type: 'revenue',
                isActive: true
            }).returning();
            salesAccount = newSales;
        }

        const arAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '1103%'), like(accounts.code, '102%'), like(accounts.name, '%Receivable%'), like(accounts.name, '%Customer%'), like(accounts.name, '%العملاء%'), like(accounts.name, '%المدينون%'))
        )).limit(1);
        let arAccount = arAccountRows[0];
        if (!arAccount) {
            // Create AR Account
            const [newAR] = await db.insert(accounts).values({
                tenantId,
                name: `${dict.Accounting.SystemAccounts.Customers} (Auto)`,
                code: `102-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                balance: '0'
            }).returning();
            arAccount = newAR;
        }

        const discountAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '505%'), like(accounts.name, '%Discount%'), like(accounts.name, '%خصم%'))
        )).limit(1);
        let discountAccount = discountAccountRows[0];
        if (!discountAccount) {
            const [newDisc] = await db.insert(accounts).values({
                tenantId,
                name: `${dict.Accounting.SystemAccounts.AllowedDiscount} (Auto)`,
                code: `505-${Date.now().toString().slice(-4)}`,
                type: 'expense',
                balance: '0'
            }).returning();
            discountAccount = newDisc;
        }

        if (salesAccount) {
            // Using static import logic
            const rate = data.exchangeRate || 1;
            const baseTotalAmount = totalAmount * rate;
            const baseSubtotal = subtotal * rate;
            const baseTaxTotal = taxTotal * rate;
            const basePaid = paidAmount * rate;
            const baseRemaining = baseTotalAmount - basePaid;

            const lines = [];

            // Credit Sales
            lines.push({
                accountId: salesAccount.id,
                debit: 0,
                credit: baseSubtotal,
                description: `Sales Revenue - Inv ${newInvoice.invoiceNumber}`
            });

            // Credit Tax
            if (baseTaxTotal > 0) {
                lines.push({
                    accountId: salesAccount.id,
                    debit: 0,
                    credit: baseTaxTotal,
                    description: "VAT Tax"
                });
            }

            // Debit Cash
            if (basePaid > 0 && cashAccount) {
                lines.push({
                    accountId: cashAccount.id,
                    debit: basePaid,
                    credit: 0,
                    description: `Cash Collection - Inv ${newInvoice.invoiceNumber}`
                });
            }

            // Debit AR (Specific Customer Account Fix)
            if (baseRemaining > 0.01) {
                // Determine Customer Account (Force 1103-ID pattern)
                let customerAccount = null;
                if (data.customerId) {
                    const { getOrCreateSpecificAccount } = await import("@/features/vouchers/actions");
                    customerAccount = await getOrCreateSpecificAccount(tenantId, data.customerName, '1103', 'asset', data.customerId);
                }

                const targetAccountId = customerAccount ? customerAccount.id : (arAccount ? arAccount.id : null);

                if (targetAccountId) {
                    lines.push({
                        accountId: targetAccountId,
                        debit: baseRemaining,
                        credit: 0,
                        description: `Customer Due (${data.customerName}) - Inv ${currentInvoiceNumber}`
                    });
                } else {
                    console.warn("No AR or Customer Account found for credit sale!");
                }
            }

            // Debit Discount
            if (totalDiscount > 0 && discountAccount) {
                lines.push({
                    accountId: discountAccount.id,
                    debit: totalDiscount * rate,
                    credit: 0,
                    description: `Allowed Discount - Inv ${newInvoice.invoiceNumber}`
                });
            }

            // --- GLOBAL STANDARD: COST OF GOODS SOLD (COGS) ---
            let totalCost = 0;
            data.items.forEach(item => {
                const pInfo = involvedProducts.find(p => p.id === item.productId);
                if (pInfo?.type === 'goods') {
                    const buyPrice = Number(pInfo.buyPrice || 0);
                    totalCost += (buyPrice * item.quantity);
                }
            });

            if (totalCost > 0) {
                // Find/Create Inventory & COGS Accounts
                const inventoryAccount = await getOrCreateSpecificAccount(tenantId, dict.Accounting?.SystemAccounts?.Inventory || "Inventory", '106', 'asset');
                const costAccountName = dict.Accounting?.SystemAccounts?.COGS || "Cost of Goods Sold";
                const cogsAccount = await getOrCreateSpecificAccount(tenantId, costAccountName, '501', 'expense');

                if (inventoryAccount && cogsAccount) {
                    lines.push({
                        accountId: cogsAccount.id,
                        debit: totalCost * rate,
                        credit: 0,
                        description: `COGS - Inv ${currentInvoiceNumber}`
                    });
                    lines.push({
                        accountId: inventoryAccount.id,
                        debit: 0,
                        credit: totalCost * rate,
                        description: `Inventory Out - Inv ${currentInvoiceNumber}`
                    });
                }
            }

            const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
            const totalCredit = lines.reduce((s, l) => s + l.credit, 0);

            if (Math.abs(totalDebit - totalCredit) < 0.1) {
                const jeResult = await createJournalEntry({
                    date: data.issueDate,
                    reference: currentInvoiceNumber,
                    description: `Sales Invoice ${currentInvoiceNumber} - ${data.customerName}`,
                    currency: data.currency || (await getSettings())?.currency || "EGP",
                    exchangeRate: data.exchangeRate,
                    lines: lines
                });

                if (!jeResult.success) {
                    console.error("Auto-Journal Entry Failed:", jeResult.message);
                    return {
                        success: true as const,
                        message: `${dict.Sales.Invoice.Success} (Warning: Accounting Entry Failed: ${jeResult.message})`,
                        id: Number(newInvoice.id)
                    };
                }
            } else {
                console.warn("Unbalanced Journal Entry ignored");
            }
        }

        // Removed revalidatePath to prevent Electron connection reset issues.

        // FIX: Only return primitives
        return {
            success: true as const,
            message: dict.Sales.Invoice.Success,
            id: Number(newInvoice.id),
            tokenNumber: tokenNumber
        };

    } catch (error: any) {
        console.error("Error creating invoice:", error);
        const detail = error.detail ? ` - ${error.detail}` : "";
        const code = error.code ? ` (Code: ${error.code})` : "";
        return {
            success: false as const,
            message: `Server Error: ${error.message || String(error)}${detail}${code}`
        };
    }
}



const recordPaymentSchema = z.object({
    invoiceId: z.number(),
    amount: z.number().positive(),
    date: z.string(),
    reference: z.string().optional(),
    tenantId: z.string().optional()
});

export async function recordPayment(inputData: z.infer<typeof recordPaymentSchema>) {
    const dict = await getDictionary();
    const validation = recordPaymentSchema.safeParse(inputData);
    if (!validation.success) return { success: false, message: dict.Common.Error };

    const data = validation.data;

    try {
        const { tenantId, userId } = await requireSession(); // Strict Tenant

        return await db.transaction(async (tx) => {
            // 1. Get Invoice
            const rows = await tx.select().from(invoices)
                .where(and(eq(invoices.id, data.invoiceId), eq(invoices.tenantId, tenantId)))
                .limit(1);

            const invoice = rows[0];

            if (!invoice) throw new Error("Invoice not found");

            const currentPaid = Number(invoice.amountPaid || 0);
            const total = Number(invoice.totalAmount);
            const remaining = total - currentPaid;

            if (data.amount > remaining + 0.1) { // small buffer
                return { success: false, message: dict.Sales.Invoice.Form.Errors.AmountExceeds };
            }

            const newPaid = currentPaid + data.amount;
            let newStatus: 'paid' | 'partial' | 'unpaid' = 'partial';
            if (newPaid >= total - 0.1) newStatus = 'paid';

            // 2. Update Invoice
            await tx.update(invoices).set({
                amountPaid: newPaid.toString(),
                paymentStatus: newStatus,
                status: newStatus === 'paid' ? 'paid' : 'issued' // Update main status too if paid
            }).where(and(eq(invoices.id, invoice.id), eq(invoices.tenantId, tenantId)));

            // 3. Create Journal Entry (Cash Debit, AR Credit)
            // Find Accounts (Re-using logic, ideal to refactor to helper)
            const cashAccountRows = await tx.select().from(accounts).where(and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.code, '101%'), like(accounts.name, '%Cash%'))
            )).limit(1);
            const cashAccount = cashAccountRows[0];

            const arAccountRows = await tx.select().from(accounts).where(and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.code, '1103%'), like(accounts.code, '102%'), like(accounts.name, '%Customer%'))
            )).limit(1);
            const arAccount = arAccountRows[0];

            if (cashAccount && arAccount) {
                const { createJournalEntry } = await import("@/features/accounting/actions");
                const exchangeRate = Number(invoice.exchangeRate) || 1;
                const baseAmount = data.amount * exchangeRate;

                await createJournalEntry({
                    date: data.date,
                    reference: data.reference || `${dict.Accounting.Journal.PaymentEntry}-${invoice.invoiceNumber}`,
                    description: `${dict.Accounting.Journal.PaymentEntry} from Inv ${invoice.invoiceNumber}`,
                    currency: invoice.currency || (await getSettings())?.currency || "EGP",
                    lines: [
                        {
                            accountId: cashAccount.id,
                            debit: baseAmount,
                            credit: 0,
                            description: `${dict.Accounting.Journal.TreasuryDeposit} - Inv ${invoice.invoiceNumber}`
                        },
                        {
                            accountId: arAccount.id,
                            debit: 0,
                            credit: baseAmount,
                            description: `${dict.Accounting.Journal.PaymentEntry} - Inv ${invoice.invoiceNumber}`
                        }
                    ]
                }, tx);
            }

            // revalidatePath(path);
            // revalidatePath(path);
            return { success: true, message: dict.Common.Success };
        });

    } catch (e) {
        console.error("Error recording payment:", e);
        return { success: false, message: dict.Common.Error };
    }
}


export async function deleteInvoice(id: number) {
    const dict = await getDictionary();
    try {
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
            return { success: false, message: dict.Common.Error };
        }
        const { tenantId, userId } = await requireSession();

        const rows = await db.select().from(invoices)
            .where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)))
            .limit(1);

        const invoice = rows[0];

        if (!invoice) return { success: false, message: dict.Common.Error };

        await db.transaction(async (tx) => {
            // 1. Restore Stock
            const items = await tx.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
            for (const item of items) {
                if (item.productId) {
                    await tx.update(products)
                        .set({ stockQuantity: sql`${castNum(products.stockQuantity)} + ${item.quantity}` })
                        .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
                }
            }

            // 2. Clear Related Journal Entries (Invoice JE + Payment JEs)
            const relatedJEs = await tx.select().from(journalEntries).where(and(
                eq(journalEntries.tenantId, tenantId),
                or(
                    eq(journalEntries.reference, invoice.invoiceNumber),
                    like(journalEntries.reference, `%${invoice.invoiceNumber}%`)
                )
            ));

            const { deleteJournalEntry } = await import("@/features/accounting/actions");
            for (const je of relatedJEs) {
                await deleteJournalEntry(je.id, tx);
            }

            // 3. Delete Invoice (Items will be deleted if cascade is enabled, but let's be safe)
            await tx.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
            await tx.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)));
        });

        // revalidatePath(path);
        // revalidatePath(path);
        // revalidatePath(path);
        return { success: true, message: dict.Common.Success };
    } catch (e) {
        console.error("Delete Invoice Error:", e);
        return { success: false, message: dict.Common.Error };
    }
}

const createReturnInvoiceSchema = z.object({
    originalInvoiceId: z.number(),
    returnDate: z.string(),
    items: z.array(z.object({
        productId: z.number(),
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().nonnegative(),
    })).min(1),
    tenantId: z.string().optional()
});

export async function createReturnInvoice(inputData: z.infer<typeof createReturnInvoiceSchema>) {
    const dict = await getDictionary();
    const validation = createReturnInvoiceSchema.safeParse(inputData);
    if (!validation.success) return { success: false, message: "Invalid Data" };

    const data = validation.data;

    try {
        const { tenantId, userId } = await requireSession();

        // 1. Get Original Invoice
        const rows = await db.select().from(invoices)
            .where(and(eq(invoices.id, data.originalInvoiceId), eq(invoices.tenantId, tenantId)))
            .limit(1);

        const originalInvoice = rows[0];

        if (!originalInvoice) throw new Error("Original Invoice not found");

        // Calculate Return Totals
        let subtotal = 0;
        data.items.forEach(item => {
            subtotal += item.quantity * item.unitPrice;
        });

        // Use original exchange rate
        const exchangeRate = Number(originalInvoice.exchangeRate) || 1;

        // Calculate Tax (Proportional) - Assuming flat rate for simplicity or derived from original
        // Better: Check if original had tax. 
        // We will assume 14% if original had tax, or 0.
        const originalSubtotal = Number(originalInvoice.subtotal);
        const originalTax = Number(originalInvoice.taxTotal);
        const taxRate = originalSubtotal > 0 ? (originalTax / originalSubtotal) : 0;

        const taxTotal = subtotal * taxRate;
        const totalAmount = subtotal + taxTotal;

        // 2. Create Return Invoice
        // Note: Amounts are positive, 'type' = 'return' distinguishes it.
        const [returnInvoice] = await db.insert(invoices).values({
            tenantId: tenantId,
            invoiceNumber: `RET-${originalInvoice.invoiceNumber}-${Date.now().toString().slice(-4)}`,
            customerName: originalInvoice.customerName,
            issueDate: data.returnDate,
            dueDate: data.returnDate,
            currency: originalInvoice.currency,
            exchangeRate: originalInvoice.exchangeRate,
            subtotal: (-subtotal).toString(), // Store as negative for financial reporting ease? Or positive?
            // Let's store as NEGATIVE to make summation easier in reports.
            taxTotal: (-taxTotal).toString(),
            totalAmount: (-totalAmount).toString(),
            amountPaid: (-totalAmount).toString(), // Assuming full refund paid or credited immediately
            paymentStatus: 'paid',
            status: "issued",
            type: "return",
            relatedInvoiceId: originalInvoice.id.toString(),
            notes: `Return from Inv ${originalInvoice.invoiceNumber}`
        }).returning();

        // Recovery logic for ID
        let returnInvoiceId = returnInvoice?.id || (returnInvoice as any)?.ID || (returnInvoice as any)?.["id"];
        if (!returnInvoiceId) {
            const lastRows = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.tenantId, tenantId)).orderBy(desc(invoices.id)).limit(1);
            returnInvoiceId = lastRows[0]?.id;
        }

        if (!returnInvoiceId) throw new Error("Failed to get return invoice ID");

        // 3. Invoice Items & RESTOCK & Fetch Products for COGS
        const returnProductIds = data.items.map(i => i.productId);
        const returnProducts = await db.select({
            id: products.id,
            type: products.type,
            buyPrice: products.buyPrice
        })
            .from(products)
            .where(inArray(products.id, returnProductIds));

        for (const item of data.items) {
            await db.insert(invoiceItems).values({
                invoiceId: returnInvoiceId,
                productId: item.productId,
                description: item.description,
                quantity: item.quantity.toString(),
                unitPrice: item.unitPrice.toString(),
                total: (-1 * item.quantity * item.unitPrice).toString(),
            });

            // RESTOCK (Increase Quantity)
            const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
            const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
            await db.update(products)
                .set({ stockQuantity: sql`${castNum(products.stockQuantity)} + ${item.quantity}` })
                .where(and(eq(products.id, item.productId), eq(products.tenantId, tenantId)));
        }

        // 4. Accounting Entry (Reverse of Sale)

        // Find OR Create Sales Account
        const salesAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '401%'), like(accounts.name, '%Sales%'), like(accounts.name, '%Revenue%'))
        )).limit(1);
        let salesAccount = salesAccountRows[0];
        if (!salesAccount) {
            const [newSales] = await db.insert(accounts).values({
                tenantId,
                name: "Sales Revenue (Auto)",
                code: `401-${Date.now().toString().slice(-4)}`,
                type: 'revenue',
                balance: '0'
            }).returning();
            salesAccount = newSales;
        }

        // Find OR Create Cash Account
        const cashAccountRows = await db.select().from(accounts).where(and(
            eq(accounts.tenantId, tenantId),
            or(like(accounts.code, '101%'), like(accounts.name, '%Cash%'))
        )).limit(1);
        let cashAccount = cashAccountRows[0];
        if (!cashAccount) {
            const [newCash] = await db.insert(accounts).values({
                tenantId,
                name: "Cash Account (Auto)",
                code: `101-${Date.now().toString().slice(-4)}`,
                type: 'asset',
                balance: '0'
            }).returning();
            cashAccount = newCash;
        }

        if (salesAccount) {
            const { createJournalEntry } = await import("@/features/accounting/actions");
            const baseSubtotal = subtotal * exchangeRate;
            const baseTaxTotal = taxTotal * exchangeRate;
            const baseTotal = totalAmount * exchangeRate;

            const lines = [
                // Debit Sales (Reduce Revenue)
                {
                    accountId: salesAccount.id,
                    debit: baseSubtotal,
                    credit: 0,
                    description: `Sales Return - Inv ${originalInvoice.invoiceNumber}`
                },
                // Debit Tax (Reduce Tax Liability)
                ...(baseTaxTotal > 0 ? [{
                    accountId: salesAccount.id,
                    debit: baseTaxTotal,
                    credit: 0,
                    description: `Return Tax - Inv ${originalInvoice.invoiceNumber}`
                }] : [])
            ];

            // --- SMART REFUND LOGIC ---
            // If credit sale, reduce AR. If cash sale, reduce Cash.
            if (originalInvoice.paymentMethod === 'credit') {
                const customerAccount = await getOrCreateSpecificAccount(tenantId, originalInvoice.customerName, '1103', 'asset', originalInvoice.customerId ?? undefined);
                lines.push({
                    accountId: customerAccount.id,
                    debit: 0,
                    credit: baseTotal,
                    description: `Reduce Debt - Return Inv ${originalInvoice.invoiceNumber}`
                });
            } else {
                // Cash or Card - Deduct from treasury
                const cashAccountRows = await db.select().from(accounts).where(and(
                    eq(accounts.tenantId, tenantId),
                    or(like(accounts.code, '101%'), like(accounts.name, '%Cash%'), like(accounts.name, '%الصندوق%'))
                )).limit(1);
                const treasury = cashAccountRows[0];
                if (treasury) {
                    lines.push({
                        accountId: treasury.id,
                        debit: 0,
                        credit: baseTotal,
                        description: `Cash Refund - Inv ${originalInvoice.invoiceNumber}`
                    });
                }
            }

            // --- REVERSE COGS (Return value to inventory) ---
            let totalReturnCost = 0;
            data.items.forEach(item => {
                const pInfo = returnProducts.find(p => p.id === item.productId);
                if (pInfo?.type === 'goods') {
                    const buyPrice = Number(pInfo.buyPrice || 0);
                    totalReturnCost += (buyPrice * item.quantity);
                }
            });

            if (totalReturnCost > 0) {
                const inventoryAccount = await getOrCreateSpecificAccount(tenantId, dict.Accounting?.SystemAccounts?.Inventory || "Inventory", '106', 'asset');
                const costAccountName = dict.Accounting?.SystemAccounts?.COGS || "Cost of Goods Sold";
                const cogsAccount = await getOrCreateSpecificAccount(tenantId, costAccountName, '501', 'expense');

                if (inventoryAccount && cogsAccount) {
                    lines.push({
                        accountId: inventoryAccount.id,
                        debit: totalReturnCost * exchangeRate,
                        credit: 0,
                        description: `Inventory In (Return) - Inv ${originalInvoice.invoiceNumber}`
                    });
                    lines.push({
                        accountId: cogsAccount.id,
                        debit: 0,
                        credit: totalReturnCost * exchangeRate,
                        description: `Reduce COGS (Return) - Inv ${originalInvoice.invoiceNumber}`
                    });
                }
            }

            const jeResult = await createJournalEntry({
                date: data.returnDate,
                reference: returnInvoice.invoiceNumber,
                description: `Sales Return Inv ${originalInvoice.invoiceNumber}`,
                currency: originalInvoice.currency,
                exchangeRate: Number(originalInvoice.exchangeRate),
                lines: lines
            });

            if (!jeResult.success) {
                console.error("Journal Entry Failed for Return:", jeResult.message);
                // We return SUCCESS but with a warning because the invoice itself was created
                return {
                    success: true,
                    message: `Return created, but accounting entry failed: ${jeResult.message}`,
                    id: returnInvoice.id
                };
            }
        } else {
            console.error("Critical: Could not find or create accounts for return invoice accounting.");
        }

        // Check if fully returned or partially
        // 1. Get all returns for this invoice (including the one we just created)
        const allReturns = await db.select().from(invoices).where(and(
            eq(invoices.relatedInvoiceId, originalInvoice.id.toString()),
            eq(invoices.type, 'return'),
            eq(invoices.tenantId, tenantId)
        ));
        // Note: Manual relation mapping for items is not needed here as we only need the totals

        // 2. Sum up totals (Absolute values because returns are negative)
        const totalReturnedAmount = allReturns.reduce((sum, ret) => sum + Math.abs(Number(ret.totalAmount)), 0);
        const originalTotal = Number(originalInvoice.totalAmount);

        // 3. Determine Status
        // Allow a tiny epsilon for float comparisons
        const isFullyReturned = Math.abs(totalReturnedAmount - originalTotal) < 0.1;

        const newStatus = isFullyReturned ? 'returned' : 'partially_returned';

        // Update Original Invoice Status
        await db.update(invoices)
            .set({ status: newStatus })
            .where(and(eq(invoices.id, originalInvoice.id), eq(invoices.tenantId, tenantId)));

        // revalidatePath(path);
        // revalidatePath(path);

        return { success: true, message: dict.Common.Success, id: returnInvoice.id };

    } catch (e: any) {
        console.error("Return Invoice Error:", e);
        return { success: false, message: dict.Common.Error };
    }
}

export async function getInvoiceWithItems(id: number) {
    const { db, withErrorHandling } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    return await withErrorHandling("getInvoiceWithItems", async () => {
        const { tenantId } = await requireSession();

        const invoice = await db.query.invoices.findFirst({
            where: and(eq(invoices.id, id), eq(invoices.tenantId, tenantId)),
            with: {
                items: true,
                customer: true
            }
        });

        if (!invoice) return null;

        return {
            ...invoice,
            items: invoice.items.map(item => ({
                id: item.id,
                productId: item.productId,
                description: item.description,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice)
            }))
        };
    });
}

export async function getInvoices(page: number = 1, pageSize: number = 100) {
    const { db, withErrorHandling } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { eq, desc } = await import("drizzle-orm");

    return await withErrorHandling("getInvoices", async () => {
        const { tenantId } = await requireSession(); // Strict Tenant
        const limit = pageSize;
        const offset = (page - 1) * limit;

        const data = await db.select().from(invoices)
            .where(eq(invoices.tenantId, tenantId))
            .orderBy(desc(invoices.issueDate), desc(invoices.id))
            .limit(limit + 1)
            .offset(offset);

        const hasNextPage = data.length > limit;
        const paginatedInvoices = hasNextPage ? data.slice(0, limit) : data;

        return {
            invoices: paginatedInvoices,
            hasNextPage
        };
    });
}
