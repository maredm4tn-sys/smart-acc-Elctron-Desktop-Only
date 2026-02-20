"use server";

import { db, withErrorHandling, logToDesktop } from "@/db";
import { products, journalLines, accounts, invoices, installments, vouchers, customers, invoiceItems, partners, journalEntries } from "@/db/schema";
import { eq, and, sql, like, ne, lt, gt, gte, desc, or } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";

export type SmartAlert = {
    id: string;
    type: 'accounting' | 'inventory' | 'system' | 'sales' | 'finance';
    severity: 'low' | 'medium' | 'high';
    titleKey: string;
    messageKey: string;
    messageParams?: Record<string, any>;
    link?: string;
    actionLabelKey?: string;
};

export async function getSmartAlerts() {
    return await withErrorHandling("getSmartAlerts", async () => {
        const session = await getSession();
        const tenantId = session?.tenantId || "tenant_default";

        const isPg = !!(process.env.Vercel || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;
        const today = new Date().toISOString().split('T')[0];

        const alerts: SmartAlert[] = [];

        // 1. Accounting vs Inventory Mismatch
        const inventoryAccRes = await db.select({
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .where(and(eq(accounts.tenantId, tenantId), like(accounts.code, '1104%')))
            .then(res => res[0]);

        const physicalInventoryValueRes = await db.select({
            total: sql<number>`SUM(${castNum(products.buyPrice)} * ${castNum(products.stockQuantity)})`
        })
            .from(products)
            .where(eq(products.tenantId, tenantId))
            .then(res => res[0]);

        const accountingValue = Number(inventoryAccRes?.balance || 0);
        const physicalValue = Number(physicalInventoryValueRes?.total || 0);
        const diff = Math.abs(accountingValue - physicalValue);

        if (diff > 1) {
            alerts.push({
                id: 'inv_mismatch',
                type: 'accounting',
                severity: 'high',
                titleKey: 'SmartAlerts.Alerts.InvMismatch.Title',
                messageKey: 'SmartAlerts.Alerts.InvMismatch.Message',
                messageParams: { physicalValue: physicalValue.toLocaleString(), accountingValue: accountingValue.toLocaleString(), diff: diff.toLocaleString() },
                link: '/dashboard/journal/new',
                actionLabelKey: 'SmartAlerts.ActionLabelDefault'
            });
        }

        // 2. Low Stock Alerts
        const lowStockRes = await db.select({ count: sql<number>`count(*)` })
            .from(products)
            .where(and(
                eq(products.tenantId, tenantId),
                sql`${castNum(products.stockQuantity)} <= ${products.minStock}`
            )).then(res => res[0]);

        if (Number(lowStockRes?.count || 0) > 0) {
            alerts.push({
                id: 'low_stock',
                type: 'inventory',
                severity: 'medium',
                titleKey: 'SmartAlerts.Alerts.LowStock.Title',
                messageKey: 'SmartAlerts.Alerts.LowStock.Message',
                messageParams: { count: Number(lowStockRes?.count || 0) },
                link: '/dashboard/inventory',
                actionLabelKey: 'Dashboard.ActiveProducts'
            });
        }

        // 3. Overdue Invoices
        const overdueInvoicesRes = await db.select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                ne(invoices.paymentStatus, 'paid'),
                lt(invoices.dueDate, today)
            )).then(res => res[0]);

        if (Number(overdueInvoicesRes?.count || 0) > 0) {
            alerts.push({
                id: 'overdue_sales',
                type: 'sales',
                severity: 'high',
                titleKey: 'SmartAlerts.Alerts.OverdueSales.Title',
                messageKey: 'SmartAlerts.Alerts.OverdueSales.Message',
                messageParams: { count: Number(overdueInvoicesRes?.count || 0) },
                link: '/dashboard/sales',
                actionLabelKey: 'Dashboard.InvoicesOverdueCount'
            });
        }

        // 4. Overdue Installments
        const overdueInstallmentsRes = await db.select({ count: sql<number>`count(*)` })
            .from(installments)
            .where(and(
                eq(installments.tenantId, tenantId),
                ne(installments.status, 'paid'),
                lt(installments.dueDate, today)
            )).then(res => res[0]);

        if (Number(overdueInstallmentsRes?.count || 0) > 0) {
            alerts.push({
                id: 'overdue_installments',
                type: 'finance',
                severity: 'high',
                titleKey: 'SmartAlerts.Alerts.OverdueInstallments.Title',
                messageKey: 'SmartAlerts.Alerts.OverdueInstallments.Message',
                messageParams: { count: Number(overdueInstallmentsRes?.count || 0) },
                link: '/dashboard/installments',
                actionLabelKey: 'Dashboard.Installments'
            });
        }

        // 5. Draft Documents
        const draftInvoices = await db.select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(and(eq(invoices.tenantId, tenantId), eq(invoices.status, 'draft')))
            .then(res => res[0]);

        const draftVouchers = await db.select({ count: sql<number>`count(*)` })
            .from(vouchers)
            .where(and(eq(vouchers.tenantId, tenantId), eq(vouchers.status, 'draft')))
            .then(res => res[0]);

        const totalDrafts = Number(draftInvoices?.count || 0) + Number(draftVouchers?.count || 0);

        if (totalDrafts > 0) {
            alerts.push({
                id: 'draft_docs',
                type: 'finance',
                severity: 'low',
                titleKey: 'SmartAlerts.Alerts.DraftDocs.Title',
                messageKey: 'SmartAlerts.Alerts.DraftDocs.Message',
                messageParams: { count: totalDrafts },
                link: '/dashboard/journal',
                actionLabelKey: 'Vouchers.Table.StatusLabels.Draft'
            });
        }

        // 6. Credit Limit Breaches
        const activeCreditCustomers = await db.select({
            id: customers.id,
            name: customers.name,
            creditLimit: customers.creditLimit,
        })
            .from(customers)
            .where(and(eq(customers.tenantId, tenantId), gt(customers.creditLimit, 0)));

        for (const cust of activeCreditCustomers) {
            const balRes = await db.select({
                balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
            })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .where(and(
                    eq(accounts.tenantId, tenantId),
                    eq(accounts.code, `1103-${cust.id}`)
                )).then(res => res[0]);

            const currentBalance = Number(balRes?.balance || 0);
            if (currentBalance > Number(cust.creditLimit || 0)) {
                alerts.push({
                    id: `credit_breach_${cust.id}`,
                    type: 'sales',
                    severity: 'medium',
                    titleKey: 'SmartAlerts.Alerts.CreditBreach.Title',
                    messageKey: 'SmartAlerts.Alerts.CreditBreach.Message',
                    messageParams: { name: cust.name, balance: currentBalance.toLocaleString(), limit: Number(cust.creditLimit).toLocaleString() },
                    link: '/dashboard/customers',
                    actionLabelKey: 'SmartAlerts.ActionLabelDefault'
                });
            }
        }

        // 7. Stagnant Stock
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const stagnantDate = thirtyDaysAgo.toISOString().split('T')[0];

        const productsWithStock = await db.select({
            id: products.id,
            name: products.name,
            qty: products.stockQuantity
        })
            .from(products)
            .where(and(eq(products.tenantId, tenantId), gt(castNum(products.stockQuantity), 0)));

        let stagnantCount = 0;
        for (const prod of productsWithStock) {
            const recentSales = await db.select({ count: sql`count(*)` })
                .from(invoiceItems)
                .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoiceItems.productId, prod.id),
                    gte(invoices.issueDate, stagnantDate)
                )).then(res => res[0]);

            if (Number((recentSales as any)?.count || 0) === 0) {
                stagnantCount++;
            }
        }

        if (stagnantCount > 0) {
            alerts.push({
                id: 'stagnant_stock',
                type: 'inventory',
                severity: 'low',
                titleKey: 'SmartAlerts.Alerts.StagnantStock.Title',
                messageKey: 'SmartAlerts.Alerts.StagnantStock.Message',
                messageParams: { count: stagnantCount },
                link: '/dashboard/reports/stagnant-stock',
                actionLabelKey: 'SmartAlerts.ActionLabelDefault'
            });
        }

        // 8. Accounting Integrity Check
        let orphanCount = 0;
        const postedVouchers = await db.select().from(vouchers).where(and(eq(vouchers.tenantId, tenantId), eq(vouchers.status, 'posted')));
        for (const v of postedVouchers) {
            const hasEntry = await db.select({ count: sql`count(*)` })
                .from(journalEntries)
                .where(and(
                    eq(journalEntries.tenantId, tenantId),
                    eq(journalEntries.reference, v.voucherNumber)
                ))
                .then(res => res[0]);
            if (Number((hasEntry as any)?.count || 0) === 0) {
                orphanCount++;
            }
        }

        if (orphanCount > 0) {
            alerts.push({
                id: 'orphan_vouchers',
                type: 'accounting',
                severity: 'high',
                titleKey: 'SmartAlerts.Alerts.OrphanVouchers.Title',
                messageKey: 'SmartAlerts.Alerts.OrphanVouchers.Message',
                messageParams: { count: orphanCount },
                link: '/dashboard/vouchers',
                actionLabelKey: 'Dashboard.Vouchers'
            });
        }

        // 10. Partner Balance Discrepancy (Ledger vs Table)
        const allPartnersRes = await db.select().from(partners).where(eq(partners.tenantId, tenantId));
        for (const p of allPartnersRes) {
            const partnerAcc = await db.select({
                balance: sql<number>`SUM(COALESCE(${castNum(journalLines.credit)}, 0) - COALESCE(${castNum(journalLines.debit)}, 0))`
            })
                .from(journalLines)
                .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
                .where(and(eq(accounts.tenantId, tenantId), eq(accounts.code, `3101-${p.id}`)))
                .then(res => res[0]);

            const ledgerBal = Number(partnerAcc?.balance || 0);
            const tableBal = parseFloat(p.initialCapital || "0") + parseFloat(p.currentBalance || "0"); // Assuming currentBalance is +/- to initial

            if (Math.abs(ledgerBal - tableBal) > 0.01) {
                alerts.push({
                    id: `partner_mismatch_${p.id}`,
                    type: 'accounting',
                    severity: 'medium',
                    titleKey: 'الشركاء - تضارب أرصدة',
                    messageKey: `رصيد الشريك {name} في الدفاتر ({ledger}) لا يطابق سجلات الشركاء ({table})`,
                    messageParams: { name: p.name, ledger: ledgerBal.toLocaleString(), table: tableBal.toLocaleString() },
                    link: '/dashboard/partners',
                    actionLabelKey: 'الشركاء'
                });
            }
        }
        // 11. High Cash Risk
        const cashAccountsRes = await db.select({
            balance: sql<number>`SUM(COALESCE(${castNum(journalLines.debit)}, 0) - COALESCE(${castNum(journalLines.credit)}, 0))`
        })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'asset'),
                or(like(accounts.name, '%cash%'), like(accounts.name, '%خزينة%'), like(accounts.name, '%صندوق%'))
            )).then(res => res[0]);

        const totalCash = Number(cashAccountsRes?.balance || 0);
        const CASH_LIMIT = 50000;
        if (totalCash > CASH_LIMIT) {
            alerts.push({
                id: 'high_cash_risk',
                type: 'finance',
                severity: 'medium',
                titleKey: 'SmartAlerts.Alerts.HighCashRisk.Title',
                messageKey: 'SmartAlerts.Alerts.HighCashRisk.Message',
                messageParams: { balance: totalCash.toLocaleString(), limit: CASH_LIMIT.toLocaleString() },
                link: '/dashboard/journal/new',
                actionLabelKey: 'SmartAlerts.ActionLabelDefault'
            });
        }

        // 12. Unusual Expense Surge
        const d = new Date();
        const firstDayThisMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
        const firstDayThreeMonthsAgo = new Date(d.getFullYear(), d.getMonth() - 3, 1).toISOString().split('T')[0];

        const expenseQuery = await db.select({
            month: sql<string>`strftime('%Y-%m', ${journalEntries.transactionDate})`,
            total: sql<number>`SUM(${castNum(journalLines.debit)})`
        })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                gte(journalEntries.transactionDate, firstDayThreeMonthsAgo)
            ))
            .groupBy(sql`strftime('%Y-%m', ${journalEntries.transactionDate})`);

        let currentMonthExp = 0;
        let prevMonthsExpSum = 0;
        let prevMonthsCount = 0;
        const currentMonthStr = firstDayThisMonth.substring(0, 7);

        for (const row of expenseQuery) {
            if (row.month === currentMonthStr) {
                currentMonthExp = Number(row.total);
            } else {
                prevMonthsExpSum += Number(row.total);
                prevMonthsCount++;
            }
        }

        const avgPrevExp = prevMonthsCount > 0 ? prevMonthsExpSum / prevMonthsCount : 0;
        if (avgPrevExp > 100 && currentMonthExp > (avgPrevExp * 1.20)) {
            const surgePercentage = Math.round(((currentMonthExp - avgPrevExp) / avgPrevExp) * 100);
            alerts.push({
                id: 'expense_surge',
                type: 'finance',
                severity: 'high',
                titleKey: 'SmartAlerts.Alerts.ExpenseSurge.Title',
                messageKey: 'SmartAlerts.Alerts.ExpenseSurge.Message',
                messageParams: { currentAmount: currentMonthExp.toLocaleString(), avgAmount: avgPrevExp.toLocaleString(), percentage: surgePercentage },
                link: '/dashboard/expenses',
                actionLabelKey: 'SmartAlerts.ActionLabelDefault'
            });
        }

        // 13. Top Customer Inactivity
        const sixtyDaysAgoStr = new Date(new Date().getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const sixMonthsAgoStr = new Date(new Date().getTime() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const topCustomersQuery = await db.select({
            customerId: invoices.customerId,
            customerName: customers.name,
            totalSales: sql<number>`SUM(${castNum(invoices.totalAmount)})`,
            lastInvoiceDate: sql<string>`MAX(${invoices.issueDate})`
        })
            .from(invoices)
            .innerJoin(customers, eq(invoices.customerId, customers.id))
            .where(and(
                eq(invoices.tenantId, tenantId),
                gte(invoices.issueDate, sixMonthsAgoStr)
            ))
            .groupBy(invoices.customerId, customers.name)
            .orderBy(desc(sql`SUM(${castNum(invoices.totalAmount)})`))
            .limit(5);

        for (const tc of topCustomersQuery) {
            if (tc.lastInvoiceDate && tc.lastInvoiceDate < sixtyDaysAgoStr) {
                const diffDays = Math.floor((new Date().getTime() - new Date(tc.lastInvoiceDate).getTime()) / (1000 * 3600 * 24));
                alerts.push({
                    id: `customer_inactivity_${tc.customerId}`,
                    type: 'sales',
                    severity: 'medium',
                    titleKey: 'SmartAlerts.Alerts.CustomerInactivity.Title',
                    messageKey: 'SmartAlerts.Alerts.CustomerInactivity.Message',
                    messageParams: { name: tc.customerName, days: diffDays },
                    link: '/dashboard/customers',
                    actionLabelKey: 'SmartAlerts.ActionLabelDefault'
                });
            }
        }

        // 14. Uninvoiced Receipts
        const thirtyDaysAgoForRcpt = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const largeReceipts = await db.select({
            id: vouchers.id,
            customerId: vouchers.partyId,
            customerName: customers.name,
            amount: vouchers.amount,
            date: vouchers.date
        })
            .from(vouchers)
            .innerJoin(customers, and(eq(vouchers.partyType, 'customer'), eq(vouchers.partyId, customers.id)))
            .where(and(
                eq(vouchers.tenantId, tenantId),
                eq(vouchers.type, 'receipt'),
                gte(castNum(vouchers.amount), 5000), // Threshold
                gte(vouchers.date, thirtyDaysAgoForRcpt)
            ));

        for (const rcpt of largeReceipts) {
            const invCountRes = await db.select({ count: sql`count(*)` })
                .from(invoices)
                .where(and(
                    eq(invoices.tenantId, tenantId),
                    eq(invoices.customerId, rcpt.customerId || 0),
                    gte(invoices.issueDate, thirtyDaysAgoForRcpt)
                )).then(res => res[0]);

            if (Number((invCountRes as any)?.count || 0) === 0) {
                alerts.push({
                    id: `uninvoiced_receipt_${rcpt.id}`,
                    type: 'finance',
                    severity: 'high',
                    titleKey: 'SmartAlerts.Alerts.UninvoicedReceipts.Title',
                    messageKey: 'SmartAlerts.Alerts.UninvoicedReceipts.Message',
                    messageParams: { amount: Number(rcpt.amount).toLocaleString(), name: rcpt.customerName },
                    link: '/dashboard/sales/new',
                    actionLabelKey: 'SmartAlerts.ActionLabelDefault'
                });
            }
        }

        // 9. System Alerts - Backup check
        alerts.push({
            id: 'backup_check',
            type: 'system',
            severity: 'low',
            titleKey: 'SmartAlerts.Alerts.BackupCheck.Title',
            messageKey: 'SmartAlerts.Alerts.BackupCheck.Message',
            link: '/dashboard/settings',
            actionLabelKey: 'SmartAlerts.ActionLabelDefault'
        });

        return alerts;
    });
}

