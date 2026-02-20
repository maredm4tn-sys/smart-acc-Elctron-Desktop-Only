'use server';

import { revalidatePath } from "next/cache";
import { getDictionary } from "@/lib/i18n-server";

async function getAccDict() {
    return await getDictionary();
}
import { db, logToDesktop } from "@/db";
import { accounts, journalEntries, journalLines, fiscalYears, tenants } from "@/db/schema";
import { sql, eq, gte, and, or, like, desc } from "drizzle-orm";
import { z } from "zod";
import { requireSession } from "@/lib/tenant-security";
import { getSettings } from "@/features/settings/actions";

const journalEntrySchema = z.object({
    date: z.string().min(1),
    description: z.string().optional(),
    lines: z.array(z.object({
        accountId: z.number(),
        description: z.string().optional(),
        debit: z.number().nonnegative(),
        credit: z.number().nonnegative(),
    })).min(2).refine(lines => {
        const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
        const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);
        return Math.abs(totalDebit - totalCredit) < 0.01;
    }, "Entry must be balanced (Debit = Credit)"),
    reference: z.string().optional(),
    currency: z.string().optional(),
    exchangeRate: z.number().optional(),
});

type JournalEntryInput = z.infer<typeof journalEntrySchema>;
export type MyJournalResult = { success: boolean; message: string; };

// Helper to get the next sequential number for Journal Entries
async function getNextEntryNumber(tenantId: string, queryDb: any) {
    const [lastEntry] = await queryDb.select({ number: journalEntries.entryNumber })
        .from(journalEntries)
        .where(eq(journalEntries.tenantId, tenantId))
        .orderBy(desc(journalEntries.id))
        .limit(1);

    if (!lastEntry) return "JE-000001";

    const lastNumStr = lastEntry.number.split('-')[1];
    const nextNum = parseInt(lastNumStr) + 1;
    return `JE-${nextNum.toString().padStart(6, '0')}`;
}

export async function createJournalEntry(inputData: JournalEntryInput, tx?: any): Promise<MyJournalResult> {
    const queryDb = tx || db;
    try {
        const { tenantId, userId } = await requireSession();
        const dict = await getAccDict();

        const validation = journalEntrySchema.safeParse(inputData);
        if (!validation.success) throw new Error(`${dict.Accounting.Journal.InvalidData}: ` + validation.error.message);

        const data = validation.data;

        // 1. Ensure Fiscal Year exists and is open
        let fy = await queryDb.query.fiscalYears.findFirst({
            where: (fy: any, { eq, and }: any) => and(eq(fy.tenantId, tenantId), eq(fy.isClosed, false))
        });

        if (!fy) {
            const currentYear = new Date().getFullYear();
            const [newFy] = await queryDb.insert(fiscalYears).values({
                tenantId: tenantId,
                name: currentYear.toString(),
                startDate: `${currentYear}-01-01`,
                endDate: `${currentYear}-12-31`,
            }).returning();
            fy = newFy;
        }

        const entryNumber = await getNextEntryNumber(tenantId, queryDb);
        const formattedDate = data.date.includes('T') ? data.date.split('T')[0] : data.date;

        // Default Currency from settings
        const settings = await getSettings();
        const defaultCurrency = settings?.currency || "EGP";

        // 2. Insert the main entry
        const [entry] = await queryDb.insert(journalEntries).values({
            tenantId,
            fiscalYearId: fy.id,
            entryNumber,
            transactionDate: formattedDate,
            description: data.description,
            reference: data.reference,
            currency: data.currency || defaultCurrency,
            exchangeRate: (data.exchangeRate || 1).toString(),
            status: "posted",
            createdBy: userId
        }).returning();

        // 3. Process Lines and update ledger balances
        for (const line of data.lines) {
            await queryDb.insert(journalLines).values({
                journalEntryId: entry.id,
                accountId: line.accountId,
                description: line.description || data.description,
                debit: line.debit.toFixed(2),
                credit: line.credit.toFixed(2),
            });

            // Precision Decimal Math via SQL
            await queryDb.update(accounts)
                .set({
                    balance: sql`CAST(CAST(COALESCE(${accounts.balance}, 0) AS REAL) + ${line.debit} - ${line.credit} AS TEXT)`
                })
                .where(and(eq(accounts.id, line.accountId), eq(accounts.tenantId, tenantId)));
        }
        revalidatePath("/dashboard/journal");
        return { success: true, message: dict.Accounting.Journal.PostSuccess.replace("{number}", entryNumber) };
    } catch (error: any) {
        logToDesktop(`❌ [createJournalEntry] Failed: ${error.message}`, 'error');
        return { success: false, message: `Error: ${error.message}` };
    }
}

export async function deleteJournalEntry(id: number, tx?: any): Promise<MyJournalResult> {
    const queryDb = tx || db;
    try {
        const { tenantId } = await requireSession();
        const dict = await getAccDict();

        const entry = await queryDb.query.journalEntries.findFirst({
            where: and(eq(journalEntries.id, id), eq(journalEntries.tenantId, tenantId)),
            with: { lines: true }
        });

        if (!entry) return { success: false, message: dict.Common.NoData };

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        for (const line of entry.lines) {
            await queryDb.update(accounts)
                .set({
                    balance: sql`${castNum(accounts.balance)} - ${line.debit} + ${line.credit}`
                })
                .where(and(
                    eq(accounts.id, line.accountId),
                    eq(accounts.tenantId, tenantId)
                ));
        }

        await queryDb.delete(journalLines).where(eq(journalLines.journalEntryId, id));
        await queryDb.delete(journalEntries).where(eq(journalEntries.id, id));

        revalidatePath("/dashboard/journal");
        return { success: true, message: dict.Accounting.Journal.DeleteSuccess };
    } catch (error: any) {
        const dict = await getAccDict();
        console.error("Error deleting journal:", error);
        return { success: false, message: error.message || dict.Accounting.Journal.DeleteError };
    }
}

export async function createAccount(inputData: any) {
    try {
        const { tenantId } = await requireSession();
        const dict = await getAccDict();

        const existing = await db.query.accounts.findFirst({
            where: (accounts, { eq, and }) => and(eq(accounts.code, inputData.code), eq(accounts.tenantId, tenantId))
        });

        if (existing) {
            return { success: false, message: dict.Accounting.Accounts.CodeUsed };
        }

        await db.insert(accounts).values({
            tenantId: tenantId,
            code: inputData.code,
            name: inputData.name,
            type: inputData.type,
            parentId: inputData.parentId || null,
            isActive: true,
            balance: '0.00',
        });

        revalidatePath("/dashboard/accounts");
        return { success: true, message: dict.Accounting.Accounts.CreateSuccess };
    } catch (error: any) {
        const dict = await getAccDict();
        console.error("Error creating account:", error);
        return { success: false, message: error.message || dict.Accounting.Accounts.CreateError };
    }
}

export async function getJournalEntry(id: number) {
    try {
        const { tenantId } = await requireSession();
        const entry = await db.query.journalEntries.findFirst({
            where: (journalEntries, { eq, and }) => and(eq(journalEntries.id, id), eq(journalEntries.tenantId, tenantId)),
            with: {
                lines: {
                    with: {
                        account: true
                    }
                }
            }
        });

        if (!entry) return null;

        const debitTotal = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
        const creditTotal = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);

        let type = "Manual";
        const ref = entry.reference?.toUpperCase() || "";
        const desc = entry.description?.toUpperCase() || "";
        if (ref.startsWith("INV") || desc.includes("INVOICE")) type = "Invoice";
        else if (ref.startsWith("PAY") || desc.includes("PAYMENT")) type = "Payment";

        return { ...entry, debitTotal, creditTotal, type };
    } catch (error) {
        console.error("Error fetching journal entry:", error);
        return null;
    }
}

export async function getJournalEntries(limit = 50) {
    try {
        const { tenantId } = await requireSession();
        const entries = await db.query.journalEntries.findMany({
            where: (journalEntries, { eq }) => eq(journalEntries.tenantId, tenantId),
            orderBy: (journalEntries, { desc }) => [desc(journalEntries.transactionDate), desc(journalEntries.createdAt)],
            limit: limit,
            with: {
                lines: {
                    with: {
                        account: true
                    }
                }
            }
        });

        return entries.map(entry => {
            const debitTotal = entry.lines.reduce((sum, line) => sum + Number(line.debit), 0);
            const creditTotal = entry.lines.reduce((sum, line) => sum + Number(line.credit), 0);
            const accountNames = Array.from(new Set(entry.lines.map(l => l.account.name)));
            const accountsSummary = accountNames.slice(0, 2).join(" / ") + (accountNames.length > 2 ? " ..." : "");

            let type = "Manual";
            const ref = entry.reference?.toUpperCase() || "";
            const desc = entry.description?.toUpperCase() || "";
            if (ref.startsWith("INV") || desc.includes("INVOICE")) type = "Invoice";
            else if (ref.startsWith("PAY") || desc.includes("PAYMENT")) type = "Payment";

            return { ...entry, debitTotal, creditTotal, accountsSummary, type };
        });
    } catch (error) {
        console.error("Error fetching journal entries:", error);
        return [];
    }
}

export async function deleteAccount(accountId: number) {
    try {
        const { tenantId } = await requireSession();
        const dict = await getAccDict();

        const children = await db.select().from(accounts).where(and(
            eq(accounts.parentId, accountId),
            eq(accounts.tenantId, tenantId)
        ));
        if (children.length > 0) {
            return { success: false, message: dict.Accounting.Accounts.DeleteParentError };
        }

        const [account] = await db.select().from(accounts).where(and(
            eq(accounts.id, accountId),
            eq(accounts.tenantId, tenantId)
        ));

        if (!account) return { success: false, message: "Account not found or unauthorized" };

        const entries = await db.select().from(journalLines).where(sql`${journalLines.accountId} = ${accountId}`).limit(1);
        if (entries.length > 0) {
            return { success: false, message: dict.Accounting.Accounts.DeleteTransactionError };
        }

        await db.delete(accounts).where(and(
            eq(accounts.id, accountId),
            eq(accounts.tenantId, tenantId)
        ));

        revalidatePath("/dashboard/accounts");
        return { success: true, message: dict.Accounting.Accounts.DeleteSuccess };
    } catch (error: any) {
        const dict = await getAccDict();
        console.error("Error deleting account:", error);
        return { success: false, message: error.message || dict.Accounting.Accounts.DeleteError };
    }
}

export async function getJournalExport() {
    try {
        const { tenantId } = await requireSession();
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
                "Status": entry.status
            };
        });
    } catch (e) {
        console.error("Export Error", e);
        return [];
    }
}

export async function getExpenseAccounts() {
    try {
        const { tenantId } = await requireSession();
        return db.query.accounts.findMany({
            where: (accounts, { eq, and }) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                eq(accounts.isActive, true)
            )
        });
    } catch (e) {
        return [];
    }
}

export async function createExpense(input: any) {
    try {
        const { tenantId } = await requireSession();
        const dict = await getAccDict();

        const cashAccount = await db.query.accounts.findFirst({
            where: (accounts, { eq, and, or, like }) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'asset'),
                or(
                    like(accounts.name, '%cash%'),
                    like(accounts.name, '%khazna%'),
                    like(accounts.name, '%treasury%'),
                    like(accounts.name, '%safe%')
                )
            )
        });

        if (!cashAccount) {
            return { success: false, message: dict.Accounting.Expenses.NoCashAccount };
        }

        const settings = await getSettings();
        const defaultCurrency = settings?.currency || "EGP";

        return createJournalEntry({
            date: input.date,
            description: input.description || dict.Accounting.Expenses.DefaultDescription,
            reference: `EXP-${Date.now()}`,
            currency: defaultCurrency,
            lines: [
                { accountId: input.accountId, debit: input.amount, credit: 0, description: input.description },
                { accountId: cashAccount.id, debit: 0, credit: input.amount, description: dict.Accounting.Expenses.CashOutDescription }
            ]
        });
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}

export async function getExpensesList(filters?: { fromDate?: string; toDate?: string; period?: 'day' | 'week' | 'month' | 'all' }) {
    try {
        const { tenantId } = await requireSession();

        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        let whereConditions = [
            eq(accounts.tenantId, tenantId),
            eq(accounts.type, 'expense'),
            sql`${accounts.code} LIKE '52%'` // Show only General & Admin Expenses (52), exclude Purchases/COGS (51)
        ];

        // Apply Date Range
        if (filters?.fromDate) {
            whereConditions.push(gte(journalEntries.transactionDate, filters.fromDate));
        }
        if (filters?.toDate) {
            whereConditions.push(sql`${journalEntries.transactionDate} <= ${filters.toDate}`);
        }

        // Apply Predefined Periods
        if (filters?.period && filters.period !== 'all') {
            if (filters.period === 'day') {
                whereConditions.push(eq(journalEntries.transactionDate, todayStr));
            } else if (filters.period === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                whereConditions.push(gte(journalEntries.transactionDate, oneWeekAgo));
            } else if (filters.period === 'month') {
                const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
                whereConditions.push(gte(journalEntries.transactionDate, startOfMonth));
            }
        }

        const results = await db.select({
            id: journalLines.id,
            date: journalEntries.transactionDate,
            accountName: accounts.name,
            amount: journalLines.debit,
            description: journalLines.description,
            entryNumber: journalEntries.entryNumber,
            reference: journalEntries.reference
        })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(and(...whereConditions))
            .orderBy(sql`${journalEntries.transactionDate} DESC`, sql`${journalEntries.createdAt} DESC`);

        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        // Monthly Sum (for the card) - Fixed to current month always for the card
        const startOfMonthNow = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().split('T')[0];
        const monthlySum = await db.select({
            total: sql<number>`sum(${castNum(journalLines.debit)})`
        })
            .from(journalLines)
            .innerJoin(accounts, eq(journalLines.accountId, accounts.id))
            .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
            .where(and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'expense'),
                sql`${accounts.code} LIKE '52%'`,
                gte(journalEntries.transactionDate, startOfMonthNow)
            ));

        // Filtered Sum (for the UI indicator)
        let filteredTotal = 0;
        results.forEach(r => filteredTotal += Number(r.amount));

        return {
            expenses: results.map(r => ({ ...r, amount: Number(r.amount) })),
            monthlyTotal: Number(monthlySum[0]?.total || 0),
            filteredTotal
        };
    } catch (e) {
        console.error("getExpensesList Error:", e);
        return { expenses: [], monthlyTotal: 0, filteredTotal: 0 };
    }
}

export async function getTreasuryAccounts() {
    try {
        const { tenantId } = await requireSession();
        return db.query.accounts.findMany({
            where: (accounts, { eq, and, or, like }) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.type, 'asset'),
                or(
                    like(accounts.name, '%Cash%'),
                    like(accounts.name, '%Bank%'),
                    like(accounts.name, '%Treasury%'),
                    like(accounts.name, '%Safe%')
                )
            )
        });
    } catch (e) {
        return [];
    }
}

export async function seedDefaultAccounts(_tenantId?: string) {
    try {
        const { tenantId } = await requireSession();
        const dict = await getAccDict();

        const defaultAccounts = [
            { code: '1', name: `${dict.Accounting.Categories.Asset} (1)`, type: 'asset' },
            { code: '11', name: dict.Accounting.SystemAccounts.CurrentAssets, type: 'asset', parentCode: '1' },
            { code: '1101', name: dict.Accounting.SystemAccounts.MainCash, type: 'asset', parentCode: '11' },
            { code: '1102', name: dict.Accounting.SystemAccounts.Bank, type: 'asset', parentCode: '11' },
            { code: '1103', name: dict.Accounting.SystemAccounts.Customers, type: 'asset', parentCode: '11' },
            { code: '1104', name: dict.Accounting.SystemAccounts.Inventory, type: 'asset', parentCode: '11' },
            { code: '12', name: dict.Accounting.SystemAccounts.FixedAssets, type: 'asset', parentCode: '1' },
            { code: '1201', name: dict.Accounting.SystemAccounts.Furniture, type: 'asset', parentCode: '12' },
            { code: '2', name: `${dict.Accounting.Categories.Liability} (2)`, type: 'liability' },
            { code: '21', name: dict.Accounting.SystemAccounts.CurrentLiabilities, type: 'liability', parentCode: '2' },
            { code: '2101', name: dict.Accounting.SystemAccounts.Suppliers, type: 'liability', parentCode: '21' },
            { code: '3', name: `${dict.Accounting.Categories.Equity} (3)`, type: 'equity' },
            { code: '31', name: dict.Accounting.SystemAccounts.Capital, type: 'equity', parentCode: '3' },
            { code: '32', name: dict.Accounting.SystemAccounts.ProfitLoss, type: 'equity', parentCode: '3' },
            { code: '4', name: `${dict.Accounting.Categories.Revenue} (4)`, type: 'revenue' },
            { code: '41', name: dict.Accounting.SystemAccounts.SalesRevenue, type: 'revenue', parentCode: '4' },
            { code: '5', name: `${dict.Accounting.Categories.Expense} (5)`, type: 'expense' },
            { code: '51', name: dict.Accounting.SystemAccounts.PurchasesCost, type: 'expense', parentCode: '5' },
            { code: '52', name: dict.Accounting.SystemAccounts.GeneralExpenses, type: 'expense', parentCode: '5' },
            { code: '5101', name: dict.Accounting.SystemAccounts.COGS, type: 'expense', parentCode: '51' },
            { code: '5103', name: dict.Accounting.SystemAccounts.AllowedDiscount, type: 'expense', parentCode: '5' },
            { code: '2102', name: dict.Accounting.SystemAccounts.VatTax, type: 'liability', parentCode: '21' },
            { code: '5201', name: dict.Accounting.SystemAccounts.Salaries, type: 'expense', parentCode: '52' },
            { code: '4102', name: dict.Accounting.SystemAccounts.InterestIncome, type: 'revenue', parentCode: '41' },
            { code: '4103', name: dict.Accounting.SystemAccounts.DeliveryRevenue, type: 'revenue', parentCode: '41' },
        ];

        for (const acc of defaultAccounts) {
            // Support finding by primary code or legacy code (e.g. '1' or '1000')
            let searchCode = acc.code;
            let legacyCode = searchCode.length === 1 ? searchCode + "000" : (searchCode.length === 2 ? searchCode + "00" : null);

            const existing = await db.query.accounts.findFirst({
                where: and(
                    or(
                        eq(accounts.code, searchCode),
                        legacyCode ? eq(accounts.code, legacyCode) : undefined
                    ),
                    eq(accounts.tenantId, tenantId)
                )
            });

            if (existing) {
                // UPDATE name if it's different and it was a system account
                if (existing.name !== acc.name) {
                    await db.update(accounts).set({ name: acc.name }).where(eq(accounts.id, existing.id));
                }
            } else {
                let parentId: number | null = null;
                if (acc.parentCode) {
                    const pCode = acc.parentCode;
                    const pLegacy = pCode.length === 1 ? pCode + "000" : (pCode.length === 2 ? pCode + "00" : null);
                    const parent = await db.query.accounts.findFirst({
                        where: and(
                            or(
                                eq(accounts.code, pCode),
                                pLegacy ? eq(accounts.code, pLegacy) : undefined
                            ),
                            eq(accounts.tenantId, tenantId)
                        )
                    });
                    parentId = parent?.id || null;
                }

                await db.insert(accounts).values({
                    tenantId,
                    name: acc.name,
                    code: acc.code,
                    type: acc.type as any,
                    parentId,
                    balance: '0',
                    isActive: true
                });
            }
        }
        return { success: true, message: dict.Accounting.Accounts.SeedSuccess };
    } catch (e: any) {
        console.error("Seed Accounts Error:", e);
        return { success: false, message: e.message };
    }
}

/**
 * 🛠️ [SERVER ACTION] closeFiscalYear
 * 1. Zeros out nominal accounts (Revenue 4xxx, Expenses 5xxx).
 * 2. Transfers net profit/loss to Profit/Loss account (32).
 * 3. Marks current fiscal year as closed.
 * 4. Opens a new fiscal year.
 */
export async function closeFiscalYear() {
    try {
        const { tenantId, userId } = await requireSession();
        const dict = (await getAccDict()) as any;

        // 1. All Async operations outside the transaction
        const fy = await db.query.fiscalYears.findFirst({
            where: (fy: any, { eq, and }: any) => and(eq(fy.tenantId, tenantId), eq(fy.isClosed, false))
        });

        if (!fy) return { success: false, message: dict.Settings?.Accounting?.FiscalClosing?.NoOpenYear };

        const nominalAccounts = await db.query.accounts.findMany({
            where: (accounts: any, { eq, and, or, like }: any) => and(
                eq(accounts.tenantId, tenantId),
                or(
                    like(accounts.code, '4%'),
                    like(accounts.code, '5%')
                )
            )
        });

        const profitLossAccount = await db.query.accounts.findFirst({
            where: (accounts: any, { eq, and }: any) => and(
                eq(accounts.tenantId, tenantId),
                eq(accounts.code, '32')
            )
        });

        if (!profitLossAccount) return { success: false, message: "Profit/Loss account (32) not found." };

        const entryNumber = await getNextEntryNumber(tenantId, db);
        const settings = await getSettings();
        const defaultCurrency = settings?.currency || "EGP";

        // 2. Synchronous Transaction
        const result = db.transaction((tx) => {
            const lines: any[] = [];
            let totalNetProfit = 0;

            for (const acc of nominalAccounts) {
                const bal = Number(acc.balance || 0);
                if (Math.abs(bal) < 0.01) continue;

                if (bal > 0) {
                    lines.push({ accountId: acc.id, debit: 0, credit: bal, description: "Year-End Closing" });
                    totalNetProfit -= bal;
                } else {
                    const positiveBal = Math.abs(bal);
                    lines.push({ accountId: acc.id, debit: positiveBal, credit: 0, description: "Year-End Closing" });
                    totalNetProfit += positiveBal;
                }
            }

            if (lines.length === 0 && Math.abs(totalNetProfit) < 0.01) {
                return { success: false, message: "No balances to close." };
            }

            if (Math.abs(totalNetProfit) >= 0.01) {
                if (totalNetProfit > 0) {
                    lines.push({ accountId: profitLossAccount.id, debit: 0, credit: totalNetProfit, description: "Current Year Net Profit" });
                } else {
                    const positiveLoss = Math.abs(totalNetProfit);
                    lines.push({ accountId: profitLossAccount.id, debit: positiveLoss, credit: 0, description: "Current Year Net Loss" });
                }
            }

            // Create Journal Entry SYNC (since Drizzle better-sqlite3 runner is sync)
            const [entry] = tx.insert(journalEntries).values({
                tenantId,
                fiscalYearId: fy.id,
                entryNumber,
                transactionDate: fy.endDate,
                description: `Year-End Closing for ${fy.name}`,
                reference: `CLS-${fy.name}`,
                currency: defaultCurrency,
                exchangeRate: "1.00",
                status: "posted",
                createdBy: userId
            }).returning();

            for (const line of lines) {
                tx.insert(journalLines).values({
                    journalEntryId: entry.id,
                    accountId: line.accountId,
                    description: line.description,
                    debit: line.debit.toFixed(2),
                    credit: line.credit.toFixed(2),
                }).run();

                tx.update(accounts)
                    .set({
                        balance: sql`CAST(CAST(COALESCE(${accounts.balance}, 0) AS REAL) + ${line.debit} - ${line.credit} AS TEXT)`
                    })
                    .where(and(eq(accounts.id, line.accountId), eq(accounts.tenantId, tenantId)))
                    .run();
            }

            // Mark closed
            tx.update(fiscalYears).set({ isClosed: true }).where(eq(fiscalYears.id, fy.id)).run();

            // Create next
            const nextYearNum = (parseInt(fy.name) || new Date().getFullYear()) + 1;
            const nextYear = nextYearNum.toString();
            tx.insert(fiscalYears).values({
                tenantId,
                name: nextYear,
                startDate: `${nextYear}-01-01`,
                endDate: `${nextYear}-12-31`,
                isClosed: false
            }).run();

            return { success: true, message: dict.Settings?.Accounting?.FiscalClosing?.Success || `Successfully closed year ${fy.name}.`, nextYear };
        });

        if (result.success) {
            revalidatePath("/dashboard");
        }
        return result;
    } catch (error: any) {
        logToDesktop(`❌ [closeFiscalYear] Error: ${error.message}`, 'error');
        return { success: false, message: error.message };
    }
}
