"use server";

import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

/**
 * 🛠️ [SERVER ACTION] getIncomeStatementData
 */
export async function getIncomeStatementData(filters?: { fromDate?: string; toDate?: string; period?: 'day' | 'week' | 'month' | 'all' }) {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { accounts, journalEntries, journalLines, invoices } = await import("@/db/schema");
    const { and, eq, gte, lte, sql, or, like, desc } = await import("drizzle-orm");

    return await withErrorHandling("getIncomeStatementData", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        if (!tenantId) throw new Error("No tenant found");

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        let finalStartDate = filters?.fromDate || new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        let finalEndDate = filters?.toDate || todayStr;

        // Apply Predefined Periods
        if (filters?.period && filters.period !== 'all') {
            if (filters.period === 'day') {
                finalStartDate = todayStr;
                finalEndDate = todayStr;
            } else if (filters.period === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                finalStartDate = oneWeekAgo;
                finalEndDate = todayStr;
            } else if (filters.period === 'month') {
                const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
                finalStartDate = startOfMonth;
                finalEndDate = todayStr;
            }
        }

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const sharedWhere = [
            eq(journalEntries.tenantId, tenantId),
            gte(journalEntries.transactionDate, finalStartDate),
            lte(journalEntries.transactionDate, finalEndDate)
        ];

        // 2. Fetch Revenue
        const revenueResult = await db
            .select({
                totalCredit: sql<number>`sum(COALESCE(${castNum(journalLines.credit)}, 0))`,
                totalDebit: sql<number>`sum(COALESCE(${castNum(journalLines.debit)}, 0))`,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    ...sharedWhere,
                    or(
                        eq(accounts.type, 'revenue'),
                        eq(accounts.type, 'income'),
                        like(accounts.code, '4%'), // Group 4: Revenue
                        like(accounts.name, '%إيراد%'),
                        like(accounts.name, '%مبيعات%')
                    )
                )
            );

        const totalRevenue = (Number(revenueResult[0]?.totalCredit) || 0) - (Number(revenueResult[0]?.totalDebit) || 0);

        // Interest separately
        const interestRes = await db.select({
            totalInterest: sql`SUM(COALESCE(${castNum(invoices.installmentInterest)}, 0))`
        })
            .from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                gte(invoices.issueDate, finalStartDate),
                lte(invoices.issueDate, finalEndDate),
                eq(invoices.isInstallment, true)
            ));

        const interestIncome = Number(interestRes[0]?.totalInterest || 0);

        // 3. Fetch Expenses
        const expenseResult = await db
            .select({
                totalCredit: sql<number>`sum(COALESCE(${castNum(journalLines.credit)}, 0))`,
                totalDebit: sql<number>`sum(COALESCE(${castNum(journalLines.debit)}, 0))`,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    ...sharedWhere,
                    or(
                        eq(accounts.type, 'expense'),
                        like(accounts.code, '5%'), // Group 5: Expenses
                        like(accounts.name, '%مصروف%'),
                        like(accounts.name, '%تكلفة%')
                    )
                )
            );

        const totalExpenses = (Number(expenseResult[0]?.totalDebit) || 0) - (Number(expenseResult[0]?.totalCredit) || 0);
        const netProfit = totalRevenue - totalExpenses;

        // 5. Detailed Expenses Breakdown
        const expenseDetails = await db
            .select({
                date: journalEntries.transactionDate,
                createdAt: journalEntries.createdAt,
                entryNumber: journalEntries.entryNumber,
                description: journalEntries.description,
                accountName: accounts.name,
                totalDebit: journalLines.debit,
                totalCredit: journalLines.credit,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    ...sharedWhere,
                    or(
                        eq(accounts.type, 'expense'),
                        like(accounts.code, '5%'),
                        like(accounts.name, '%مصروف%')
                    )
                )
            )
            .orderBy(desc(journalEntries.transactionDate), desc(journalEntries.id));

        const formattedExpenses = expenseDetails.map(item => ({
            date: item.date,
            createdAt: item.createdAt,
            entryNumber: item.entryNumber,
            name: item.description || item.accountName,
            accountName: item.accountName,
            value: (Number(item.totalDebit) || 0) - (Number(item.totalCredit) || 0)
        })).filter(item => item.value > 0);

        // 6. Detailed Revenue Breakdown
        const revenueDetails = await db
            .select({
                date: journalEntries.transactionDate,
                createdAt: journalEntries.createdAt,
                entryNumber: journalEntries.entryNumber,
                description: journalEntries.description,
                accountName: accounts.name,
                totalDebit: journalLines.debit,
                totalCredit: journalLines.credit,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    ...sharedWhere,
                    or(
                        eq(accounts.type, 'revenue'),
                        eq(accounts.type, 'income'),
                        like(accounts.code, '4%'),
                        like(accounts.name, '%إيراد%')
                    )
                )
            )
            .orderBy(desc(journalEntries.transactionDate), desc(journalEntries.id));

        let formattedRevenue = revenueDetails.map(item => ({
            date: item.date,
            createdAt: item.createdAt,
            entryNumber: item.entryNumber,
            name: item.description || item.accountName,
            accountName: item.accountName,
            value: (Number(item.totalCredit) || 0) - (Number(item.totalDebit) || 0)
        })).filter(item => item.value > 0);

        if (interestIncome > 0) {
            formattedRevenue.push({
                date: finalEndDate,
                createdAt: new Date().toISOString(),
                entryNumber: 0,
                name: "Total Installment Interest (Interest Income)",
                accountName: "Installment Interest",
                value: interestIncome
            });

            const salesIdx = formattedRevenue.findIndex(r => r.accountName.toLowerCase().includes("sales") || r.accountName.includes("مبيعات"));
            if (salesIdx !== -1) {
                formattedRevenue[salesIdx].value -= interestIncome;
                formattedRevenue[salesIdx].name += " (Net of Interest)";
            }
        }

        logToDesktop(`📊 [getIncomeStatementData] Done for period ${finalStartDate} to ${finalEndDate}`);
        return {
            totalRevenue: totalRevenue,
            totalExpenses: totalExpenses,
            netProfit: netProfit,
            interestIncome: interestIncome,
            expenseDetails: formattedExpenses,
            revenueDetails: formattedRevenue,
            startDate: finalStartDate,
            endDate: finalEndDate
        };
    });
}

export async function getProfitExport() {
    const { withErrorHandling, logToDesktop } = await import("@/db");
    return await withErrorHandling("getProfitExport", async () => {
        const { getDictionary } = await import("@/lib/i18n-server");
        const dict = await getDictionary() as any;
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        if (!session || (session.role !== 'admin' && session.role !== 'SUPER_ADMIN')) {
            return [];
        }

        // Default to Current Year
        const now = new Date();
        const fromDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        const toDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];

        const result = await getIncomeStatementData({ fromDate, toDate });
        if (!result.success || !result.data) return [];
        const data = result.data;

        // Flatten for Excel
        const rows = [
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.TotalRevenue, [dict.Reports.IncomeStatement.Table.Value]: Number(data.totalRevenue.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.TotalExpenses, [dict.Reports.IncomeStatement.Table.Value]: Number(data.totalExpenses.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.NetProfit, [dict.Reports.IncomeStatement.Table.Value]: Number(data.netProfit.toFixed(2)) },
            { [dict.Reports.IncomeStatement.Table.Item]: "", [dict.Reports.IncomeStatement.Table.Value]: "" }, // Spacer
            { [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.RevenueDetails + ":", [dict.Reports.IncomeStatement.Table.Value]: "" },
        ];

        // Add Revenue Details
        if (data.revenueDetails && data.revenueDetails.length > 0) {
            data.revenueDetails.forEach((rev: any) => {
                rows.push({
                    [dict.Reports.IncomeStatement.Table.Item]: rev.name,
                    [dict.Reports.IncomeStatement.Table.Value]: Number(rev.value.toFixed(2))
                });
            });
        } else {
            rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.Table.NoRevenues, [dict.Reports.IncomeStatement.Table.Value]: 0 });
        }


        rows.push({ [dict.Reports.IncomeStatement.Table.Item]: "", [dict.Reports.IncomeStatement.Table.Value]: "" }); // Spacer
        rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.ExpenseDetails + ":", [dict.Reports.IncomeStatement.Table.Value]: "" });

        // Add Expense Details
        if (data.expenseDetails && data.expenseDetails.length > 0) {
            data.expenseDetails.forEach((exp: any) => {
                rows.push({
                    [dict.Reports.IncomeStatement.Table.Item]: exp.name,
                    [dict.Reports.IncomeStatement.Table.Value]: Number(exp.value.toFixed(2))
                });
            });
        } else {
            rows.push({ [dict.Reports.IncomeStatement.Table.Item]: dict.Reports.IncomeStatement.Table.NoExpenses, [dict.Reports.IncomeStatement.Table.Value]: 0 });
        }

        return rows;
    });
}

export async function getSalesSummary() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { invoices, purchaseInvoices, products, customers, suppliers, accounts, journalLines } = await import("@/db/schema");
    const { and, eq, gte, sql, or, like } = await import("drizzle-orm");

    return await withErrorHandling("getSalesSummary", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) return null;

        const now = new Date();
        const formatDate = (date: Date) => date.toISOString().split('T')[0];

        const startOfDay = formatDate(now);
        const startOfMonth = formatDate(new Date(now.getFullYear(), now.getMonth(), 1));
        const startOfYear = formatDate(new Date(now.getFullYear(), 0, 1));

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Helper to get sum
        const getSum = async (dateCondition: any) => {
            const result = await db.select({
                total: sql<number>`sum(COALESCE(${castNum(invoices.totalAmount)}, 0))`,
                count: sql<number>`count(${invoices.id})`
            })
                .from(invoices)
                .where(
                    and(
                        eq(invoices.tenantId, tenantId),
                        dateCondition
                    )
                );
            return result[0] || { total: 0, count: 0 };
        };

        // Parallel Fetching for all dashboard metrics
        const [
            daily,
            monthly,
            yearly,
            customerDebtsRes,
            supplierDebtsRes,
            productsCount,
            customersCount,
            suppliersCount,
            cashBalanceRes,
            vatCollectedRes,
            vatPaidRes,
            inventoryItems
        ] = await Promise.all([
            getSum(gte(invoices.issueDate, startOfDay)),
            getSum(gte(invoices.issueDate, startOfMonth)),
            getSum(gte(invoices.issueDate, startOfYear)),
            db.select({
                total: sql<number>`sum(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'customer'),
                        like(accounts.name, '%عميل%'),
                        like(accounts.name, '%عملاء%'),
                        like(accounts.code, '1103%')
                    )
                )
            ),
            db.select({
                total: sql<number>`sum(COALESCE(${castNum(journalLines.credit)}, 0) - COALESCE(${castNum(journalLines.debit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'supplier'),
                        like(accounts.name, '%مورد%'),
                        like(accounts.name, '%موردين%'),
                        like(accounts.code, '2101%')
                    )
                )
            ),
            db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(suppliers).where(eq(suppliers.tenantId, tenantId)),
            db.select({
                balance: sql<number>`sum(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'cash'),
                        eq(accounts.type, 'bank'),
                        like(accounts.name, '%خزينة%'),
                        like(accounts.name, '%بنك%'),
                        like(accounts.name, '%صندوق%'),
                        like(accounts.name, '%Cash%'),
                        like(accounts.name, '%Bank%'),
                        like(accounts.code, '1101%')
                    )
                )
            ),
            db.select({
                total: sql<number>`sum(COALESCE(${castNum(invoices.totalAmount)}, 0) * 0.14 / 1.14)`
            }).from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))),
            db.select({
                total: sql<number>`sum(COALESCE(${castNum(purchaseInvoices.totalAmount)}, 0) * 0.14 / 1.14)`
            }).from(purchaseInvoices).where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.type, 'purchase'))),
            db.select({
                stock: products.stockQuantity,
                price: products.buyPrice
            }).from(products).where(and(eq(products.tenantId, tenantId), eq(products.type, 'goods')))
        ]);

        const totalInventoryValue = inventoryItems.reduce((acc, item) => acc + (Number(item.stock || 0) * Number(item.price || 0)), 0);

        logToDesktop(`📊 [getSalesSummary] Stats calculated correctly for tenant ${tenantId}`);
        return {
            daily: { total: Number(daily.total || 0), count: daily.count },
            monthly: { total: Number(monthly.total || 0), count: monthly.count },
            yearly: { total: Number(yearly.total || 0), count: yearly.count },
            customerDebts: Number(customerDebtsRes[0]?.total || 0),
            supplierDebts: Number(supplierDebtsRes[0]?.total || 0),
            productsCount: productsCount[0]?.count || 0,
            customersCount: customersCount[0]?.count || 0,
            suppliersCount: suppliersCount[0]?.count || 0,
            cashBalance: Number(cashBalanceRes[0]?.balance || 0),
            vatCollected: Number(vatCollectedRes[0]?.total || 0),
            vatPaid: Number(vatPaidRes[0]?.total || 0),
            inventoryValue: totalInventoryValue,
        };
    });
}

export async function getInventoryReport() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { products, stockLevels, warehouses } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");

    return await withErrorHandling("getInventoryReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) return null;

        // Fetch all GOODS
        const allProducts = await db.select().from(products)
            .where(and(eq(products.tenantId, tenantId), eq(products.type, 'goods')));

        // Fetch stock levels joined with warehouses
        const allStockLevels = await db.select({
            productId: stockLevels.productId,
            warehouseName: warehouses.name,
            quantity: stockLevels.quantity
        })
            .from(stockLevels)
            .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
            .where(eq(stockLevels.tenantId, tenantId));

        // Group by product
        const stockByProduct: Record<number, any[]> = {};
        allStockLevels.forEach(sl => {
            if (!stockByProduct[sl.productId]) stockByProduct[sl.productId] = [];
            stockByProduct[sl.productId].push(sl);
        });

        let totalCostValue = 0;
        let totalSalesValue = 0;
        let lowStockItems: any[] = [];
        const LOW_STOCK_THRESHOLD = 5;

        const reportItems = allProducts.map(product => {
            const qty = Number(product.stockQuantity || 0);
            const cost = Number(product.buyPrice || 0);
            const price = Number(product.sellPrice || 0);

            if (qty > 0) {
                totalCostValue += (qty * cost);
                totalSalesValue += (qty * price);
            }

            const itemWithBreakdown = {
                ...product,
                stockBreakdown: stockByProduct[product.id] || []
            };

            if (qty <= LOW_STOCK_THRESHOLD) {
                lowStockItems.push(itemWithBreakdown);
            }

            return itemWithBreakdown;
        });

        logToDesktop(`📊 [getInventoryReport] Processed ${allProducts.length} items`);
        return {
            totalItems: allProducts.length,
            totalCostValue,
            totalSalesValue,
            potentialProfit: totalSalesValue - totalCostValue,
            lowStockItems: lowStockItems.sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity)),
            allProducts: reportItems
        };
    });
}

export async function getCategorySales(startDate: Date, endDate: Date) {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { invoiceItems, invoices, products, categories } = await import("@/db/schema");
    const { and, eq, gte, lte, sql, desc } = await import("drizzle-orm");

    return await withErrorHandling("getCategorySales", async () => {
        const { getDictionary } = await import("@/lib/i18n-server");
        const dict = await getDictionary();
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) return [];

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const data = await db
            .select({
                categoryName: categories.name,
                totalAmount: sql<number>`sum(COALESCE(${castNum(invoiceItems.unitPrice)}, 0) * COALESCE(${castNum(invoiceItems.quantity)}, 0))`,
                count: sql<number>`count(${invoiceItems.id})`,
            })
            .from(invoiceItems)
            .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
            .innerJoin(products, eq(invoiceItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    gte(invoices.issueDate, startDate.toISOString().split('T')[0]),
                    lte(invoices.issueDate, endDate.toISOString().split('T')[0])
                )
            )
            .groupBy(categories.id, categories.name)
            .orderBy(desc(sql`sum(COALESCE(${castNum(invoiceItems.unitPrice)}, 0) * COALESCE(${castNum(invoiceItems.quantity)}, 0))`));

        logToDesktop(`📊 [getCategorySales] Found ${data.length} categories`);
        return data.map(item => ({
            name: item.categoryName || dict.Common?.Uncategorized,
            value: Number(item.totalAmount) || 0,
            count: Number(item.count) || 0
        }));
    });
}

export async function getStagnantProducts(days: number = 30) {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { products, invoiceItems, invoices } = await import("@/db/schema");
    const { and, eq, gte, sql, gt } = await import("drizzle-orm");

    return await withErrorHandling("getStagnantProducts", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(now.getDate() - days);
        const cutoffStr = cutoffDate.toISOString().split('T')[0];

        // 1. Get all stocked goods created BEFORE the cutoff (to avoid flagging new items)
        // We only care about items that HAVE stock. If stock is 0, it's not stagnant capital.
        const stockItems = await db
            .select({
                id: products.id,
                name: products.name,
                sku: products.sku,
                stock: products.stockQuantity,
                buyPrice: products.buyPrice,
                sellPrice: products.sellPrice,
                createdAt: products.createdAt
            })
            .from(products)
            .where(
                and(
                    eq(products.tenantId, tenantId),
                    eq(products.type, 'goods'),
                    sql`CAST(${products.stockQuantity} AS REAL) > 0`
                )
            );

        // 2. Get IDs of products sold within the period (since cutoff)
        const soldItems = await db
            .selectDistinct({ productId: invoiceItems.productId })
            .from(invoiceItems)
            .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    gte(invoices.issueDate, cutoffStr)
                )
            );

        const soldIds = new Set(soldItems.map(i => i.productId));

        // 3. Filter stagnant items
        const stagnantItems = stockItems.filter(item => {
            // Exclude if sold recently
            if (soldIds.has(item.id)) return false;

            // Exclude if created recently (give it a chance)
            // If createdAt is null, assume it's old -> include it.
            if (item.createdAt) {
                const created = new Date(item.createdAt);
                if (created > cutoffDate) return false;
            }

            return true;
        });

        // 4. Calculate Totals
        let totalStockValue = 0;
        const itemsWithValues = stagnantItems.map(item => {
            const stockVal = (Number(item.stock) * Number(item.buyPrice || 0));
            totalStockValue += stockVal;
            return {
                ...item,
                stockValue: stockVal
            };
        });

        logToDesktop(`📊 [getStagnantProducts] Found ${itemsWithValues.length} stagnant items for tenant ${tenantId}`);
        return {
            data: itemsWithValues.sort((a, b) => b.stockValue - a.stockValue), // Sort by highest value stuck
            totalValue: totalStockValue,
            cutoffDate: cutoffStr
        };
    });
}

/**
 * 🛠️ [SERVER ACTION] getBalanceSheetData
 */
export async function getBalanceSheetData() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { accounts, journalLines } = await import("@/db/schema");
    const { and, eq, sql, or, like } = await import("drizzle-orm");

    return await withErrorHandling("getBalanceSheetData", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Fetch all account balances
        // Logic: Group 1=Assets, 2=Liabilities, 3=Equity
        const balances = await db
            .select({
                id: accounts.id,
                name: accounts.name,
                code: accounts.code,
                type: accounts.type,
                balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
            })
            .from(accounts)
            .leftJoin(journalLines, eq(accounts.id, journalLines.accountId))
            .where(eq(accounts.tenantId, tenantId))
            .groupBy(accounts.id, accounts.name, accounts.code, accounts.type);

        const assets: any[] = [];
        const liabilities: any[] = [];
        const equity: any[] = [];
        let netProfit = 0;

        balances.forEach(acc => {
            const bal = Number(acc.balance || 0);
            if (bal === 0 && !acc.code) return; // Skip empty/unused

            // Classification based on Code (Primary) or Type (Secondary)
            if (acc.code?.startsWith('1') || ['asset', 'cash', 'bank', 'customer', 'inventory'].includes(acc.type || '')) {
                assets.push({ name: acc.name, value: bal });
            } else if (acc.code?.startsWith('2') || ['liability', 'supplier'].includes(acc.type || '')) {
                // Liabilities are usually credit balances, so show them as positive in the report (credit - debit)
                liabilities.push({ name: acc.name, value: -bal });
            } else if (acc.code?.startsWith('3') || ['equity'].includes(acc.type || '')) {
                equity.push({ name: acc.name, value: -bal });
            } else if (acc.code?.startsWith('4') || acc.code?.startsWith('5') || ['revenue', 'income', 'expense'].includes(acc.type || '')) {
                // Net Profit = (Credits - Debits) for revenue - (Debits - Credits) for expenses
                // Which is just -(Debits - Credits) total for these groups.
                netProfit += -bal;
            }
        });

        // Add Net Profit to Equity
        if (Math.abs(netProfit) > 0.01) {
            equity.push({
                name: "Current Year Net Profit / Loss",
                value: netProfit,
                isGenerated: true
            });
        }

        const totalAssets = assets.reduce((sum, a) => sum + a.value, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.value, 0);
        const totalEquity = equity.reduce((sum, e) => sum + e.value, 0);

        logToDesktop(`📊 [getBalanceSheetData] Assets: ${totalAssets}, L+E: ${totalLiabilities + totalEquity}, Net Profit: ${netProfit}`);
        return {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity,
            netProfit,
            isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01
        };
    });
}

export async function getCreditReport() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { invoices, customers, accounts, journalLines } = await import("@/db/schema");
    const { and, eq, sql, gt, asc, desc } = await import("drizzle-orm");

    return await withErrorHandling("getCreditReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // 1. Fetch Invoices for detailed overdue tracking
        const detailedInvoices = await db.select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerName: invoices.customerName,
            totalAmount: invoices.totalAmount,
            amountPaid: invoices.amountPaid,
            issueDate: invoices.issueDate,
            dueDate: invoices.dueDate,
        })
            .from(invoices)
            .where(
                and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.type, 'sale'),
                )
            );

        // 2. Fetch Customer Balances from Ledger (to capture Opening Balances / Manual Entries)
        const customerBalances = await db.select({
            id: customers.id,
            customerName: customers.name,
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(customers)
            .innerJoin(accounts, eq(accounts.tenantId, tenantId))
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(customers.tenantId, tenantId),
                eq(accounts.code, sql`'1103-' || ${customers.id}`)
            ))
            .groupBy(customers.id, customers.name);

        const result: any[] = [];
        const handledInvoices = new Set<string>();

        // Add detailed invoices first
        detailedInvoices.forEach(i => {
            const total = Number(i.totalAmount || 0);
            const paid = Number(i.amountPaid || 0);
            const remaining = total - paid;
            if (remaining > 0.01) {
                result.push({
                    ...i,
                    remaining
                });
                handledInvoices.add(i.invoiceNumber);
            }
        });

        // Add Customers with balances that aren't fully covered by invoices (e.g. Opening Balances)
        for (const cb of customerBalances) {
            const totalDue = Number(cb.balance || 0);
            const invoiceSum = detailedInvoices
                .filter(i => i.customerName === cb.customerName)
                .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

            const gap = totalDue - invoiceSum;
            if (gap > 0.1) {
                result.push({
                    id: `legacy-${cb.id}`,
                    invoiceNumber: "رصيد سابق / افتتاحية",
                    customerName: cb.customerName,
                    totalAmount: totalDue,
                    amountPaid: invoiceSum,
                    remaining: gap,
                    issueDate: null,
                    dueDate: null,
                });
            }
        }

        logToDesktop(`📊 [getCreditReport] Found ${result.length} items for tenant ${tenantId}`);
        return result.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    });
}

export async function getFinancialCommandData() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { invoices, customers, suppliers, accounts, journalLines, products } = await import("@/db/schema");
    const { and, eq, sql, gt, lte, lt, or, like } = await import("drizzle-orm");

    return await withErrorHandling("getFinancialCommandData", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        const today = new Date();
        const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // 1. LIQUIDITY: Cash & Bank
        const cashRes = await db.select({
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(accounts)
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                sql`${accounts.type} IN ('asset', 'cash', 'bank')`,
                sql`${accounts.code} LIKE '1101-%' OR ${accounts.code} LIKE '1102-%' OR ${accounts.code} = '1101' OR ${accounts.code} = '1102'` // Cash & Banks
            ));
        const cashLiquidity = Number(cashRes[0]?.balance || 0);

        // 2. LIQUIDITY: Inventory Value
        const inventoryRes = await db.select({
            totalValue: sql<number>`SUM(COALESCE(${castNum(products.stockQuantity)}, 0) * COALESCE(${castNum(products.buyPrice)}, 0))`
        })
            .from(products)
            .where(eq(products.tenantId, tenantId));
        const inventoryValue = Number(inventoryRes[0]?.totalValue || 0);

        // 3. RECEIVABLES: Detailed Aging + Ledger Total
        const [allReceivables, ledgerRecRes] = await Promise.all([
            db.select({
                id: invoices.id,
                total: invoices.totalAmount,
                paid: invoices.amountPaid,
                dueDate: invoices.dueDate
            })
                .from(invoices)
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.type, 'sale'),
                    gt(sql`COALESCE(${castNum(invoices.totalAmount)}, 0) - COALESCE(${castNum(invoices.amountPaid)}, 0)`, 0.01)
                )),
            db.select({
                balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'customer'),
                        like(accounts.code, '1103%')
                    )
                )
            )
        ]);

        const totalLedgerReceivables = Number(ledgerRecRes[0]?.balance || 0);

        let rec_current = 0, rec_1_30 = 0, rec_31_plus = 0;
        let invoiceDebtSum = 0;

        allReceivables.forEach(r => {
            const remaining = Number(r.total || 0) - Number(r.paid || 0);
            invoiceDebtSum += remaining;
            if (!r.dueDate || r.dueDate >= today.toISOString().split('T')[0]) {
                rec_current += remaining;
            } else if (r.dueDate >= thirtyDaysAgo) {
                rec_1_30 += remaining;
            } else {
                rec_31_plus += remaining;
            }
        });

        // If there's a gap (Opening Balance / Manual Entry), add it to current
        const recGap = totalLedgerReceivables - invoiceDebtSum;
        if (recGap > 1) {
            rec_current += recGap;
        }

        // 4. PAYABLES: Detailed Aging + Ledger Total
        const [allPayables, ledgerPayRes] = await Promise.all([
            db.select({
                id: invoices.id,
                total: invoices.totalAmount,
                paid: invoices.amountPaid,
                dueDate: invoices.dueDate
            })
                .from(invoices)
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.type, 'purchase'),
                    gt(sql`COALESCE(${castNum(invoices.totalAmount)}, 0) - COALESCE(${castNum(invoices.amountPaid)}, 0)`, 0.01)
                )),
            db.select({
                balance: sql<number>`SUM(COALESCE(${castNum(journalLines.credit)}, 0) - COALESCE(${castNum(journalLines.debit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        eq(accounts.type, 'supplier'),
                        like(accounts.code, '2101%')
                    )
                )
            )
        ]);

        const totalLedgerPayables = Number(ledgerPayRes[0]?.balance || 0);

        let pay_current = 0, pay_1_30 = 0, pay_31_plus = 0;
        let purchaseDebtSum = 0;

        allPayables.forEach(p => {
            const remaining = Number(p.total || 0) - Number(p.paid || 0);
            purchaseDebtSum += remaining;
            if (!p.dueDate || p.dueDate >= today.toISOString().split('T')[0]) {
                pay_current += remaining;
            } else if (p.dueDate >= thirtyDaysAgo) {
                pay_1_30 += remaining;
            } else {
                pay_31_plus += remaining;
            }
        });

        // Add gap to current payables
        const payGap = totalLedgerPayables - purchaseDebtSum;
        if (payGap > 1) {
            pay_current += payGap;
        }

        // 5. Net Position = Total Equity (which is Sum of all Debits - Sum of all Credits across all accounts)
        // More accurately from Balance Sheet perspective:
        const totalPosRes = await db.select({
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(accounts)
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(eq(accounts.tenantId, tenantId));

        const netPosition = Number(totalPosRes[0]?.balance || 0);

        // Assets (Positive accounts of type asset)
        const assetsRes = await db.select({
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(accounts)
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'asset')
            ))
            .groupBy(accounts.id)
            .having(gt(sql`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`, 0));

        const totalAssets = assetsRes.reduce((acc, r) => acc + Number(r.balance || 0), 0);

        // Liabilities (Negative accounts of type asset (Credit customers) + Positive accounts of type liability (Credit suppliers))
        const totalLiabilities = totalAssets - netPosition;

        return {
            liquidity: {
                cash: cashLiquidity,
                inventory: inventoryValue,
                total: cashLiquidity + inventoryValue
            },
            receivables: {
                current: rec_current,
                aged_1_30: rec_1_30,
                aged_31_plus: rec_31_plus,
                total: rec_current + rec_1_30 + rec_31_plus
            },
            payables: {
                current: pay_current,
                aged_1_30: pay_1_30,
                aged_31_plus: pay_31_plus,
                total: pay_current + pay_1_30 + pay_31_plus
            },
            netPosition,
            totalAssets,
            totalLiabilities
        };
    });
}

export async function getSupplierDebitReport() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { purchaseInvoices, suppliers, accounts, journalLines } = await import("@/db/schema");
    const { and, eq, sql, gt, asc } = await import("drizzle-orm");

    return await withErrorHandling("getSupplierDebitReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // 1. Fetch Purchase Invoices for detailed overdue tracking
        const detailedInvoices = await db.select({
            id: purchaseInvoices.id,
            invoiceNumber: purchaseInvoices.invoiceNumber,
            supplierName: purchaseInvoices.supplierName,
            totalAmount: purchaseInvoices.totalAmount,
            amountPaid: purchaseInvoices.amountPaid,
            issueDate: purchaseInvoices.issueDate,
            dueDate: purchaseInvoices.dueDate,
        })
            .from(purchaseInvoices)
            .where(
                and(
                    eq(purchaseInvoices.tenantId, tenantId),
                    eq(purchaseInvoices.type, 'purchase'),
                )
            );

        // 2. Fetch Supplier Balances from Ledger
        const supplierBalances = await db.select({
            id: suppliers.id,
            supplierName: suppliers.name,
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.credit)}, 0) - COALESCE(${castNum(journalLines.debit)}, 0))`
        })
            .from(suppliers)
            .innerJoin(accounts, eq(accounts.tenantId, tenantId))
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(suppliers.tenantId, tenantId),
                eq(accounts.code, sql`'2101-' || ${suppliers.id}`)
            ))
            .groupBy(suppliers.id, suppliers.name);

        const result: any[] = [];

        // Add detailed invoices first
        detailedInvoices.forEach(i => {
            const total = Number(i.totalAmount || 0);
            const paid = Number(i.amountPaid || 0);
            const remaining = total - paid;
            if (remaining > 0.01) {
                result.push({
                    ...i,
                    remaining
                });
            }
        });

        // Add Suppliers with balances that aren't fully covered by invoices
        for (const sb of supplierBalances) {
            const totalDue = Number(sb.balance || 0);
            const invoiceSum = detailedInvoices
                .filter(i => i.supplierName === sb.supplierName)
                .reduce((sum, i) => sum + (Number(i.totalAmount) - Number(i.amountPaid)), 0);

            const gap = totalDue - invoiceSum;
            if (gap > 0.1) {
                result.push({
                    id: `legacy-sup-${sb.id}`,
                    invoiceNumber: "رصيد سابق / افتتاحية",
                    supplierName: sb.supplierName,
                    totalAmount: totalDue,
                    amountPaid: invoiceSum,
                    remaining: gap,
                    issueDate: null,
                    dueDate: null,
                });
            }
        }

        return result.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return a.dueDate.localeCompare(b.dueDate);
        });
    });
}

export async function getCustomerCreditReport() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { customers, accounts, journalLines } = await import("@/db/schema");
    const { and, eq, sql, lt } = await import("drizzle-orm");

    return await withErrorHandling("getCustomerCreditReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Fetch Customer Balances from Ledger (where Balance is negative = they have money with us)
        const creditBalances = await db.select({
            id: customers.id,
            customerName: customers.name,
            phone: customers.phone,
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(customers)
            .innerJoin(accounts, eq(accounts.tenantId, tenantId))
            .innerJoin(journalLines, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(customers.tenantId, tenantId),
                eq(accounts.code, sql`'1103-' || ${customers.id}`)
            ))
            .groupBy(customers.id, customers.name, customers.phone)
            .having(lt(sql`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`, -0.01));

        return creditBalances.map(b => ({
            ...b,
            creditAmount: Math.abs(Number(b.balance || 0))
        }));
    });
}

/**
 * 🛠️ [SERVER ACTION] getTrialBalanceData
 */
export async function getTrialBalanceData() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { accounts, journalLines } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");

    return await withErrorHandling("getTrialBalanceData", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Fetch all accounts and their movement from journalLines
        const balances = await db
            .select({
                id: accounts.id,
                code: accounts.code,
                name: accounts.name,
                type: accounts.type,
                totalDebit: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0))`,
                totalCredit: sql<number>`SUM(COALESCE(${castNum(journalLines.credit)}, 0))`
            })
            .from(accounts)
            .leftJoin(journalLines, eq(accounts.id, journalLines.accountId))
            .where(eq(accounts.tenantId, tenantId))
            .groupBy(accounts.id, accounts.name, accounts.code, accounts.type)
            .orderBy(accounts.code);

        const rows = balances.map(b => {
            const deb = Number(b.totalDebit || 0);
            const cre = Number(b.totalCredit || 0);

            return {
                code: b.code || "",
                name: b.name,
                type: b.type,
                totalDebit: deb,
                totalCredit: cre,
                balanceDebit: deb > cre ? deb - cre : 0,
                balanceCredit: cre > deb ? cre - deb : 0
            };
        }).filter(r => r.totalDebit !== 0 || r.totalCredit !== 0 || (r.code && r.code.length <= 4));

        const totalDebit = rows.reduce((sum, r) => sum + r.balanceDebit, 0);
        const totalCredit = rows.reduce((sum, r) => sum + r.balanceCredit, 0);

        logToDesktop(`📊 [getTrialBalanceData] Generated ${rows.length} rows. Total D: ${totalDebit}, Total C: ${totalCredit}`);

        return {
            rows,
            totalDebit,
            totalCredit,
            isBalanced: Math.abs(totalDebit - totalCredit) < 0.01
        };
    });
}
