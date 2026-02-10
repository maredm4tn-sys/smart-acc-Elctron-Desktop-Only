import { db } from "@/db";
import { accounts, journalEntries, journalLines, products, customers } from "@/db/schema";
import { and, eq, gte, lte, sql } from "drizzle-orm";

export async function getInventoryData(tenantId: string) {
    try {
        const data = await db.query.products.findMany({
            where: (products, { eq }) => eq(products.tenantId, tenantId),
            orderBy: (products, { asc }) => [asc(products.sku)],
        });

        return data.map(p => ({
            "SKU": p.sku,
            "Product Name": p.name,
            "Type": p.type === 'goods' ? 'Stockable' : 'Service',
            "Buy Price": Number(p.buyPrice),
            "Sell Price": Number(p.sellPrice),
            "Current Stock": Number(p.stockQuantity),
        }));
    } catch (e) {
        console.error("Inventory Export Error", e);
        return [];
    }
}

export async function getCustomersData(tenantId: string) {
    try {
        const data = await db.query.customers.findMany({
            where: (c, { eq }) => eq(c.tenantId, tenantId),
            orderBy: (c, { asc }) => [asc(c.name)],
        });

        return data.map(c => ({
            "Name": c.name,
            "Company": c.companyName || "-",
            "Phone": c.phone || "-",
            "Email": c.email || "-",
            "Tax ID": c.taxId || "-",
            "Address": c.address || "-"
        }));
    } catch (e) {
        console.error("Customers Export Error", e);
        return [];
    }
}

export async function getJournalData(tenantId: string) {
    try {
        const entries = await db.query.journalEntries.findMany({
            where: (journalEntries, { eq }) => eq(journalEntries.tenantId, tenantId),
            orderBy: (journalEntries, { desc }) => [desc(journalEntries.transactionDate)],
            with: { lines: { with: { account: true } } }
        });

        return entries.map(entry => {
            const debitTotal = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
            const creditTotal = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
            const accountNames = Array.from(new Set(entry.lines.map(l => l.account.name)));
            const accountsSummary = accountNames.join(" / ");

            let type = "Manual";
            const ref = entry.reference?.toUpperCase() || "";
            const desc = entry.description?.toUpperCase() || "";
            if (ref.startsWith("INV") || desc.includes("INVOICE")) type = "Invoice";
            else if (ref.startsWith("PAY") || desc.includes("PAYMENT")) type = "Payment";

            return {
                "Entry No": entry.entryNumber,
                "Date": new Date(entry.transactionDate).toLocaleDateString('en-GB'),
                "Type": type,
                "Description": entry.description,
                "Accounts": accountsSummary,
                "Debit Total": debitTotal,
                "Credit Total": creditTotal,
                "Currency": entry.currency,
                "Status": entry.status === 'posted' ? 'Posted' : 'Draft'
            };
        });
    } catch (e) {
        console.error("Journal Export Error", e);
        return [];
    }
}

export async function getProfitData(tenantId: string) {
    try {
        // Default to Current Year
        const now = new Date();
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const endOfYear = new Date(now.getFullYear(), 11, 31);
        const startDate = startOfYear.toISOString().split('T')[0];
        const endDate = endOfYear.toISOString().split('T')[0];

        // 1. Fetch Revenue
        const revenueResult = await db
            .select({
                totalCredit: sql<number>`sum(${journalLines.credit})`,
                totalDebit: sql<number>`sum(${journalLines.debit})`,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    eq(journalEntries.tenantId, tenantId),
                    eq(accounts.type, 'revenue'),
                    gte(journalEntries.transactionDate, startDate),
                    lte(journalEntries.transactionDate, endDate)
                )
            );

        const totalRevenue = (Number(revenueResult[0]?.totalCredit) || 0) - (Number(revenueResult[0]?.totalDebit) || 0);

        // 2. Fetch Expenses
        const expenseResult = await db
            .select({
                totalCredit: sql<number>`sum(${journalLines.credit})`,
                totalDebit: sql<number>`sum(${journalLines.debit})`,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    eq(journalEntries.tenantId, tenantId),
                    eq(accounts.type, 'expense'),
                    gte(journalEntries.transactionDate, startDate),
                    lte(journalEntries.transactionDate, endDate)
                )
            );

        const totalExpenses = (Number(expenseResult[0]?.totalDebit) || 0) - (Number(expenseResult[0]?.totalCredit) || 0);
        const netProfit = totalRevenue - totalExpenses;

        // 3. Detailed Expenses
        const expenseDetails = await db
            .select({
                accountName: accounts.name,
                totalDebit: sql<number>`sum(${journalLines.debit})`,
                totalCredit: sql<number>`sum(${journalLines.credit})`,
            })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(
                and(
                    eq(journalEntries.tenantId, tenantId),
                    eq(accounts.type, 'expense'),
                    gte(journalEntries.transactionDate, startDate),
                    lte(journalEntries.transactionDate, endDate)
                )
            )
            .groupBy(accounts.name);

        const formattedExpenses = expenseDetails.map(item => ({
            name: item.accountName,
            value: (Number(item.totalDebit) || 0) - (Number(item.totalCredit) || 0)
        })).filter(item => item.value > 0);

        // Flatten for Excel
        const rows: any[] = [
            { "Item": "Total Revenue", "Value": Number(totalRevenue.toFixed(2)) },
            { "Item": "Total Expenses", "Value": Number(totalExpenses.toFixed(2)) },
            { "Item": "Net Profit / Loss", "Value": Number(netProfit.toFixed(2)) },
            { "Item": "", "Value": "" }, // Spacer
            { "Item": "Expense Details:", "Value": "" },
        ];

        formattedExpenses.forEach(exp => {
            rows.push({
                "Item": exp.name,
                "Value": Number(exp.value.toFixed(2))
            });
        });

        return rows;
    } catch (e) {
        console.error("Profit Export Error", e);
        return [];
    }
}
