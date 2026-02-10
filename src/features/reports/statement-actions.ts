
"use server";

import { db } from "@/db";
import { customers, invoices, journalEntries, journalLines, suppliers, accounts, installments } from "@/db/schema";
import { and, eq, gte, lte, lt, desc, asc, sql } from "drizzle-orm";
import { getSession } from "@/features/auth/actions";
import { getActiveTenantId } from "@/lib/actions-utils";

export type StatementEntry = {
    date: Date;
    dueDate?: string | null;
    type: string;
    description: string;
    reference?: string | null;
    debit: number;
    credit: number;
    balance: number;
};

// --- Generic Account Statement ---
export async function getAccountStatement(
    accountId: number,
    startDate: Date,
    endDate: Date
) {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
    if (!tenantId) throw new Error("Unauthorized");

    // 0. Get Account Details
    const [account] = await db.select().from(accounts).where(and(eq(accounts.id, accountId), eq(accounts.tenantId, tenantId)));
    if (!account) throw new Error("Account not found");

    // 1. Get Opening Balance (Sum BEFORE startDate)
    // Formula: Sum(Debit) - Sum(Credit) [Standard Asset/Expense nature]
    // If Liability/Revenue/Equity, it should be Credit - Debit.
    // For simplicity, we calculate Net Debit, then adjust display based on type.

    const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL || process.env.DATABASE_URL);
    const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

    const openingBalanceQuery = await db
        .select({
            totalDebit: sql<number>`sum(${castNum(journalLines.debit)})`,
            totalCredit: sql<number>`sum(${castNum(journalLines.credit)})`
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                eq(journalLines.accountId, accountId),
                lt(journalEntries.transactionDate, startDate.toISOString().split('T')[0])
            )
        );

    const initDebit = Number(openingBalanceQuery[0]?.totalDebit || 0);
    const initCredit = Number(openingBalanceQuery[0]?.totalCredit || 0);

    // Determine sign based on Account Type
    // Asset/Expense: Debit +, Credit -
    // Liability/Equity/Revenue: Credit +, Debit -
    const isCreditNature = ['liability', 'equity', 'revenue'].includes(account.type);

    let openingBalance = isCreditNature ? (initCredit - initDebit) : (initDebit - initCredit);

    // 2. Fetch Transactions
    const transactions = await db
        .select({
            date: journalEntries.transactionDate,
            description: journalLines.description, // Use line description for detail
            reference: journalEntries.reference,
            debit: journalLines.debit,
            credit: journalLines.credit,
            dueDate: invoices.dueDate,
        })
        .from(journalLines)
        .innerJoin(journalEntries, eq(journalLines.journalEntryId, journalEntries.id))
        .leftJoin(invoices, and(eq(journalEntries.reference, invoices.invoiceNumber), eq(journalEntries.tenantId, tenantId)))
        .where(
            and(
                eq(journalEntries.tenantId, tenantId),
                eq(journalLines.accountId, accountId),
                gte(journalEntries.transactionDate, startDate.toISOString().split('T')[0]),
                lte(journalEntries.transactionDate, endDate.toISOString().split('T')[0])
            )
        )
        .orderBy(asc(journalEntries.transactionDate), asc(journalEntries.id));

    // 3. Running Balance
    let runningBalance = openingBalance;
    const finalStatement: StatementEntry[] = [];

    const { getDictionary } = await import("@/lib/i18n-server");
    const dict = (await getDictionary()) as any;

    finalStatement.push({
        date: startDate,
        type: 'OPENING',
        description: dict.Reports.GeneralStatement?.OpeningBalance || "Opening Balance",
        debit: 0,
        credit: 0,
        balance: runningBalance
    });

    for (const trx of transactions) {
        const debit = Number(trx.debit || 0);
        const credit = Number(trx.credit || 0);

        if (isCreditNature) {
            runningBalance += (credit - debit);
        } else {
            runningBalance += (debit - credit);
        }

        finalStatement.push({
            date: trx.date ? new Date(trx.date) : new Date(),
            dueDate: trx.dueDate || null,
            type: 'TRX',
            description: trx.description || '-',
            reference: trx.reference,
            debit: debit,
            credit: credit,
            balance: runningBalance
        });
    }

    return {
        statement: finalStatement,
        entity: { name: account.name, code: account.code },
        openingBalance,
        closingBalance: runningBalance
    };
}

// --- Wrapper for Key-Value Entities (Customer/Supplier) ---
export async function getCustomerStatement(
    entityType: 'customer' | 'supplier',
    entityId: number,
    startDate: Date,
    endDate: Date
) {
    const session = await getSession();
    const tenantId = session?.tenantId || await getActiveTenantId() || "tenant_default";
    if (!tenantId) throw new Error("Unauthorized");

    // Resolve Entity ID to Account ID based on Name Matching
    let targetEntityName = "";
    const cleanId = Number(entityId);

    if (entityType === 'customer') {
        const [c] = await db.select().from(customers).where(and(eq(customers.id, cleanId), eq(customers.tenantId, tenantId)));
        if (!c) throw new Error(`Customer ID (${cleanId}) not found in the system.`);
        targetEntityName = c.name;
    } else {
        const [s] = await db.select().from(suppliers).where(and(eq(suppliers.id, cleanId), eq(suppliers.tenantId, tenantId)));
        if (!s) throw new Error(`Supplier ID (${cleanId}) not found in the system.`);
        targetEntityName = s.name;
    }

    // Use ILIKE (or similar) or trim for better matching
    // In SQLite, we use trim() and lower()
    const foundAccounts = await db.select().from(accounts).where(
        and(
            eq(accounts.tenantId, tenantId),
            sql`trim(lower(${accounts.name})) = trim(lower(${targetEntityName}))`
        )
    );

    const account = foundAccounts[0];

    if (!account) {
        // Fallback if no linked account found yet (rare if system is consistent)
        return {
            statement: [],
            entity: { name: targetEntityName, code: 'N/A', error: "Financial account not found for this name." },
            openingBalance: 0,
            closingBalance: 0
        };
    }

    const statementData = await getAccountStatement(account.id, startDate, endDate);

    // Fetch Installments for this customer
    const userInstallments = await db.select({
        dueDate: installments.dueDate,
        amount: installments.amount,
        status: installments.status,
        invoiceNumber: invoices.invoiceNumber
    })
        .from(installments)
        .innerJoin(invoices, eq(installments.invoiceId, invoices.id))
        .where(and(eq(installments.customerId, cleanId), eq(installments.tenantId, tenantId)))
        .orderBy(asc(installments.dueDate));

    return {
        ...statementData,
        installments: userInstallments
    };
}
