"use server";

import { db } from "@/db";
import { invoices, accounts, products, purchaseInvoices, journalLines, journalEntries, installments, customers } from "@/db/schema";
import { count, sum, sql, eq, and, gt, desc, gte, or, like, asc } from "drizzle-orm";
import { getCashierStats } from "@/features/sales/stats";
import { getSession } from "@/features/auth/actions";

export async function getDashboardStats() {
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const role = session.role;

    if (role === 'cashier') {
        const cashierStats = await getCashierStats(session.userId);
        return { role: 'cashier', data: cashierStats };
    }

    // Admin Stats
    try {
        const tenantId = session.tenantId;

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // 1. Fetch Basic Totals (Revenue, Counts, Low Stock, etc)
        const [
            revenueRes,
            accRes,
            prodRes,
            invRes,
            lowStockItems,
            overdueInvoices,
            duePurchases,
            dailySalesRes,
            dailyCountRes,
            upcomingInstallmentsTotalRes,
            upcomingInstallments
        ] = await Promise.all([
            db.select({ value: sql`COALESCE(SUM(${castNum(invoices.totalAmount)}), 0)` })
                .from(invoices)
                .where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))).then(res => res[0]),
            db.select({ value: count() }).from(accounts).where(eq(accounts.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(products).where(eq(products.tenantId, tenantId)).then(res => res[0]),
            db.select({ value: count() }).from(invoices).where(eq(invoices.tenantId, tenantId)).then(res => res[0]),
            db.select({
                id: products.id,
                name: products.name,
                stockQuantity: products.stockQuantity
            }).from(products).where(and(eq(products.tenantId, tenantId), sql`${castNum(products.stockQuantity)} <= 10`)).limit(5),
            db.select({
                id: invoices.id,
                customer: invoices.customerName,
                amount: sql`${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)}`,
                date: invoices.issueDate,
                dueDate: invoices.dueDate
            }).from(invoices).where(
                and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.type, 'sale'),
                    gt(sql`${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)}`, 0)
                )
            ).orderBy(asc(invoices.dueDate), desc(invoices.issueDate)).limit(10),
            db.select({
                id: purchaseInvoices.id,
                supplier: purchaseInvoices.supplierName,
                amount: sql`${castNum(purchaseInvoices.totalAmount)} - ${castNum(purchaseInvoices.amountPaid)}`,
                date: purchaseInvoices.issueDate
            }).from(purchaseInvoices).where(
                and(
                    eq(purchaseInvoices.tenantId, tenantId),
                    gt(sql`${castNum(purchaseInvoices.totalAmount)} - ${castNum(purchaseInvoices.amountPaid)}`, 0)
                )
            ).orderBy(desc(purchaseInvoices.issueDate)).limit(5),
            db.select({ value: sql`COALESCE(SUM(${castNum(invoices.totalAmount)}), 0)` })
                .from(invoices)
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    gte(invoices.issueDate, new Date().toISOString().split('T')[0])
                ))
                .then(res => res[0]),
            db.select({ value: count() })
                .from(invoices)
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    gte(invoices.issueDate, new Date().toISOString().split('T')[0])
                ))
                .then(res => res[0]),
            db.select({ value: sql`COALESCE(SUM(${castNum(installments.amount)}), 0)` })
                .from(installments)
                .where(and(eq(installments.tenantId, tenantId), eq(installments.status, 'unpaid')))
                .then(res => res[0]),
            db.select({
                id: installments.id,
                customer: customers.name,
                amount: installments.amount,
                due: installments.dueDate
            })
                .from(installments)
                .innerJoin(customers, eq(installments.customerId, customers.id))
                .where(and(eq(installments.tenantId, tenantId), eq(installments.status, 'unpaid')))
                .orderBy(installments.dueDate)
                .limit(5),
        ]);

        // 2. Fetch Accounting Balances (Receivables & Liquidity) & Inventory Value & Payables
        const [recRes, cashRes, inventoryRes, payablesRes] = await Promise.all([
            // Receivables: Sum balances of accounts under '1103' or type 'customer'
            db.select({ value: sql`COALESCE(SUM(${castNum(journalLines.debit)} - ${castNum(journalLines.credit)}), 0)` })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .where(and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'customer'),
                        like(accounts.code, '1103%'), // User's Customer code
                        like(accounts.name, '%عملاء%'),
                        like(accounts.name, '%عميل%')
                    )
                )).then(res => res[0]),

            // Liquidity: Sum balances of cash/bank accounts (1101 for this user)
            db.select({ value: sql`COALESCE(SUM(${castNum(journalLines.debit)} - ${castNum(journalLines.credit)}), 0)` })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .where(and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'cash'),
                        eq(accounts.type, 'bank'),
                        like(accounts.code, '1101%'), // User's Cash/Bank code
                        like(accounts.name, '%خزينة%'),
                        like(accounts.name, '%بنك%'),
                        like(accounts.name, '%صندوق%')
                    )
                )).then(res => res[0]),

            // Inventory Value (Calculated from Assets Group 1104 or Products table)
            // We use the Products table as the primary source for stock value
            db.select({
                total: sql`SUM(${castNum(products.buyPrice)} * ${castNum(products.stockQuantity)})`
            }).from(products).where(eq(products.tenantId, tenantId)).then(res => res[0]),

            // Payables: Sum balances of accounts under '2101' or type 'supplier'
            db.select({ value: sql`COALESCE(SUM(${castNum(journalLines.credit)} - ${castNum(journalLines.debit)}), 0)` })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .where(and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'supplier'),
                        like(accounts.code, '2101%'), // Supplier Group
                        like(accounts.name, '%مورد%'),
                        like(accounts.name, '%موردين%')
                    )
                )).then(res => res[0]),
        ]);

        const totalReceivables = Number(recRes?.value || 0);
        const cashLiquidity = Number(cashRes?.value || 0);
        const totalInventoryValue = Number(inventoryRes?.total || 0);
        const totalPayables = Number(payablesRes?.value || 0);

        // 3. Daily Stats Logic
        const dailyTotal = Number(dailySalesRes?.value || 0);
        const dailyCount = Number(dailyCountRes?.value || 0);
        const averageBasket = dailyCount > 0 ? dailyTotal / dailyCount : 0;

        // 4. Total Assets = Sum of all Group 1 accounts (or Cash + Inventory + Receivables)
        // For accuracy with manual entries, we fetch the balance of all accounts starting with '1'
        const totalAssetsRes = await db.select({ value: sql`COALESCE(SUM(${castNum(journalLines.debit)} - ${castNum(journalLines.credit)}), 0)` })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                like(accounts.code, '1%') // All Assets
            )).then(res => res[0]);

        const totalAssets = Number(totalAssetsRes?.value || 0);

        return {
            role: 'admin',
            data: {
                totalRevenue: Number(revenueRes?.value || 0).toFixed(2),
                totalAccounts: Number(accRes?.value || 0),
                activeProducts: Number(prodRes?.value || 0),
                invoicesCount: Number(invRes?.value || 0),
                totalReceivables: totalReceivables.toFixed(2),
                totalPayables: totalPayables.toFixed(2),
                cashLiquidity: cashLiquidity.toFixed(2),
                totalAssets: totalAssets.toFixed(2),
                inventoryValue: totalInventoryValue.toFixed(2),
                avgBasket: averageBasket.toFixed(2),
                lowStockItems: lowStockItems.map(p => ({
                    id: p.id,
                    name: p.name,
                    quantity: p.stockQuantity
                })),
                overdueInvoices,
                duePurchases,
                upcomingInstallmentsTotal: Number(upcomingInstallmentsTotalRes?.value || 0).toFixed(2),
                upcomingInstallments: upcomingInstallments,
                topProducts: await db.select({
                    name: products.name,
                    sold: sql<number>`SUM(${castNum(sql`invoice_items.quantity`)})`
                })
                    .from(products)
                    .innerJoin(sql`invoice_items`, sql`invoice_items.product_id = products.id`)
                    .innerJoin(invoices, sql`invoice_items.invoice_id = invoices.id`)
                    .where(and(eq(products.tenantId, tenantId), eq(invoices.type, 'sale')))
                    .groupBy(products.id)
                    .orderBy(desc(sql`SUM(${castNum(sql`invoice_items.quantity`)})`))
                    .limit(5),
            }
        };
    } catch (e: any) {
        console.error("Dashboard stats error", e);
        return {
            role: 'admin',
            data: {
                totalRevenue: 0,
                totalAccounts: 0,
                activeProducts: 0,
                invoicesCount: 0,
                totalReceivables: 0,
                cashLiquidity: 0,
                avgBasket: 0,
                lowStockItems: [],
                overdueInvoices: [],
                duePurchases: [],
                upcomingInstallmentsTotal: 0,
                upcomingInstallments: [],
                topProducts: [],
                inventoryValue: 0,
            },
            error: false
        };
    }
}

export async function getAnalyticsData() {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return null;

    try {
        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        const getMonthSql = (col: any) => isPg ? sql`TO_CHAR(${col}, 'MM')` : sql`strftime('%m', ${col})`;

        const [topProducts, incomeCompare] = await Promise.all([
            db.select({
                name: products.name,
                value: sql<number>`SUM(${castNum(sql`invoice_items.quantity`)})`
            })
                .from(products)
                .innerJoin(sql`invoice_items`, sql`invoice_items.product_id = products.id`)
                .innerJoin(invoices, sql`invoice_items.invoice_id = invoices.id`)
                .where(and(eq(products.tenantId, tenantId), eq(invoices.type, 'sale')))
                .groupBy(products.id)
                .orderBy(desc(sql`SUM(${castNum(sql`invoice_items.quantity`)})`))
                .limit(5),

            db.select({
                month: getMonthSql(journalEntries.transactionDate),
                profit: sql<number>`SUM(CASE WHEN ${accounts.type} IN ('revenue', 'income') THEN ${castNum(journalLines.credit)} - ${castNum(journalLines.debit)} ELSE 0 END)`,
                expense: sql<number>`SUM(CASE WHEN ${accounts.type} = 'expense' THEN ${castNum(journalLines.debit)} - ${castNum(journalLines.credit)} ELSE 0 END)`
            })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
                .where(eq(journalEntries.tenantId, tenantId))
                .groupBy(getMonthSql(journalEntries.transactionDate))
                .orderBy(getMonthSql(journalEntries.transactionDate))
                .limit(12)
        ]);

        return {
            topProducts,
            incomeCompare: incomeCompare.map(i => ({
                name: i.month,
                profit: Number(i.profit || 0),
                expense: Number(i.expense || 0)
            }))
        };
    } catch (e) {
        console.error("Analytics Data Error", e);
        return null;
    }
}

export async function getRevenueChartData() {
    const session = await getSession();
    const tenantId = session?.tenantId;
    if (!tenantId) return [];

    try {
        const rawData = await db.select({
            date: invoices.issueDate,
            amount: invoices.totalAmount
        })
            .from(invoices)
            .where(eq(invoices.tenantId, tenantId))
            .limit(100);

        const daysMap: Record<string, number> = {};
        rawData.forEach(inv => {
            if (!inv.date) return;
            const dayName = new Date(inv.date).toLocaleDateString('en-US', { weekday: 'long' });
            daysMap[dayName] = (daysMap[dayName] || 0) + Number(inv.amount);
        });

        return Object.entries(daysMap).map(([name, value]) => ({ name, value }));
    } catch (e) {
        console.error("Chart data error", e);
        return [];
    }
}
