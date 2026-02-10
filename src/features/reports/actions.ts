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
                        like(accounts.code, '4%') // Assuming '4' is the prefix for revenue accounts
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
                    eq(accounts.type, 'expense')
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
            .where(and(...sharedWhere, eq(accounts.type, 'expense')))
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
                        like(accounts.code, '4%') // Assuming '4' is the prefix for revenue accounts
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

            const salesIdx = formattedRevenue.findIndex(r => r.accountCode?.startsWith('401') || r.accountName.toLowerCase().includes("sales"));
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
                total: sql<number>`sum(COALESCE(${castNum(invoices.totalAmount)}, 0) - COALESCE(${castNum(invoices.amountPaid)}, 0))`
            }).from(invoices).where(and(eq(invoices.tenantId, tenantId), eq(invoices.type, 'sale'))),
            db.select({
                total: sql<number>`sum(COALESCE(${castNum(purchaseInvoices.totalAmount)}, 0) - COALESCE(${castNum(purchaseInvoices.amountPaid)}, 0))`
            }).from(purchaseInvoices).where(and(eq(purchaseInvoices.tenantId, tenantId), eq(purchaseInvoices.type, 'purchase'))),
            db.select({ count: sql<number>`count(*)` }).from(products).where(eq(products.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(customers).where(eq(customers.tenantId, tenantId)),
            db.select({ count: sql<number>`count(*)` }).from(suppliers).where(eq(suppliers.tenantId, tenantId)),
            db.select({
                balance: sql<number>`sum(COALESCE(${castNum(journalLines.debit)}, 0)) - sum(COALESCE(${castNum(journalLines.credit)}, 0))`
            }).from(journalLines).innerJoin(accounts, eq(journalLines.accountId, accounts.id)).where(
                and(
                    eq(accounts.tenantId, tenantId),
                    or(
                        like(accounts.code, '101%'), // Cash accounts
                        like(accounts.code, '102%'), // Bank accounts
                        like(accounts.name, '%Cash%'),
                        like(accounts.name, '%Treasury%'),
                        like(accounts.name, '%Bank%')
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
    const { products } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    return await withErrorHandling("getInventoryReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) return null;

        // Fetch all GOODS (exclude services)
        const allProducts = await db.select().from(products)
            .where(
                and(
                    eq(products.tenantId, tenantId),
                    eq(products.type, 'goods')
                )
            );

        let totalCostValue = 0;
        let totalSalesValue = 0;
        let lowStockItems: typeof allProducts = [];
        const LOW_STOCK_THRESHOLD = 5;

        allProducts.forEach(product => {
            const qty = Number(product.stockQuantity || 0);
            const cost = Number(product.buyPrice || 0);
            const price = Number(product.sellPrice || 0);

            if (qty > 0) {
                totalCostValue += (qty * cost);
                totalSalesValue += (qty * price);
            }

            if (qty <= LOW_STOCK_THRESHOLD) {
                lowStockItems.push(product);
            }
        });

        logToDesktop(`📊 [getInventoryReport] Processed ${allProducts.length} items`);
        return {
            totalItems: allProducts.length,
            totalCostValue,
            totalSalesValue,
            potentialProfit: totalSalesValue - totalCostValue,
            lowStockItems: lowStockItems.sort((a, b) => Number(a.stockQuantity) - Number(b.stockQuantity))
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
            name: item.categoryName || dict.Common?.Uncategorized || "General",
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

export async function getCreditReport() {
    const { db, withErrorHandling, logToDesktop } = await import("@/db");
    const { invoices } = await import("@/db/schema");
    const { and, eq, sql, gt, asc, desc } = await import("drizzle-orm");

    return await withErrorHandling("getCreditReport", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
        if (!tenantId) throw new Error("Unauthorized");

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const data = await db.select({
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
            )
            .orderBy(asc(invoices.dueDate), desc(invoices.issueDate));

        const result = data.map(i => {
            const total = Number(i.totalAmount || 0);
            const paid = Number(i.amountPaid || 0);
            return {
                ...i,
                remaining: total - paid
            };
        }).filter(i => i.remaining > 0.01);

        logToDesktop(`📊 [getCreditReport] Found ${result.length} overdue invoices for tenant ${tenantId}`);
        return result;
    });
}
