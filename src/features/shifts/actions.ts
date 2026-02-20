"use server";

import { db } from "@/db";
import { shifts, invoices, vouchers } from "@/db/schema";
import { and, eq, desc, sql } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";

export async function getActiveShift() {
    try {
        const { tenantId, userId } = await requireSession();

        const rows = await db.select().from(shifts).where(and(
            eq(shifts.tenantId, tenantId),
            eq(shifts.userId, userId),
            eq(shifts.status, 'open')
        )).orderBy(desc(shifts.startTime)).limit(1);

        return rows.length > 0 ? rows[0] : null;
    } catch (e) {
        console.warn("Active shift check failed:", e);
        return null;
    }
}

export async function openShift(startBalance: number) {
    try {
        const { tenantId, userId } = await requireSession();

        const active = await getActiveShift();
        if (active) return { success: false, message: "You already have an open shift." };

        const lastShiftRows = await db.select().from(shifts)
            .where(eq(shifts.tenantId, tenantId))
            .orderBy(desc(shifts.shiftNumber))
            .limit(1);

        const nextNumber = (lastShiftRows[0]?.shiftNumber || 0) + 1;

        await db.insert(shifts).values({
            tenantId,
            userId: userId,
            shiftNumber: nextNumber,
            startBalance: String(startBalance),
            status: 'open',
            startTime: new Date(),
        });

        const newShiftRows = await db.select().from(shifts)
            .where(and(eq(shifts.tenantId, tenantId), eq(shifts.shiftNumber, nextNumber)))
            .limit(1);

        return { success: true, data: newShiftRows[0] || null };
    } catch (e: any) {
        console.error("Error opening shift:", e);
        return { success: false, message: e.message };
    }
}

export async function getShiftSummary(shiftId: number) {
    try {
        const isPg = !!(process.env.VERCEL || process.env.POSTGRES_URL);
        const castNum = (col: any) => isPg ? sql`CAST(${col} AS DOUBLE PRECISION)` : sql`CAST(${col} AS REAL)`;

        const invStats = await db.select({
            totalCash: sql<number>`sum(case when ${invoices.paymentMethod} = 'cash' then ${castNum(invoices.totalAmount)} else 0 end)`,
            totalVisa: sql<number>`sum(case when ${invoices.paymentMethod} = 'card' then ${castNum(invoices.totalAmount)} else 0 end)`,
            totalUnpaid: sql<number>`sum(case when ${invoices.paymentStatus} != 'paid' then ${castNum(invoices.totalAmount)} - ${castNum(invoices.amountPaid)} else 0 end)`,
        })
            .from(invoices)
            .where(eq(invoices.shiftId, shiftId));

        const voucherStats = await db.select({
            totalReceipts: sql<number>`sum(case when ${vouchers.type} = 'receipt' then ${castNum(vouchers.amount)} else 0 end)`,
            totalPayments: sql<number>`sum(case when ${vouchers.type} = 'payment' then ${castNum(vouchers.amount)} else 0 end)`,
        })
            .from(vouchers)
            .where(eq(vouchers.shiftId, shiftId));

        const cashSales = invStats[0]?.totalCash || 0;
        const visaSales = invStats[0]?.totalVisa || 0;
        const unpaidSales = invStats[0]?.totalUnpaid || 0;
        const receipts = voucherStats[0]?.totalReceipts || 0;
        const payments = voucherStats[0]?.totalPayments || 0;

        return {
            cashSales,
            visaSales,
            unpaidSales,
            receipts,
            payments,
            netCashMovement: cashSales + receipts - payments
        };
    } catch (e) {
        console.error("Error calculating shift summary:", e);
        return { cashSales: 0, visaSales: 0, unpaidSales: 0, receipts: 0, payments: 0, netCashMovement: 0 };
    }
}

export async function closeShift(shiftId: number, actualCash: number, notes?: string) {
    try {
        const { tenantId, userId } = await requireSession();

        const rows = await db.select().from(shifts)
            .where(and(eq(shifts.id, shiftId), eq(shifts.tenantId, tenantId)))
            .limit(1);

        const shift = rows.length > 0 ? rows[0] : null;
        if (!shift || shift.status !== 'open') return { success: false, message: "Shift not found or already closed" };

        const summary = await getShiftSummary(shiftId);

        const startBal = Number(shift.startBalance || 0);
        const expectedCash = startBal + summary.netCashMovement;

        await db.update(shifts).set({
            endBalance: String(actualCash),
            systemCashBalance: String(expectedCash),
            systemVisaBalance: String(summary.visaSales),
            systemUnpaidBalance: String(summary.unpaidSales),
            status: 'closed',
            endTime: new Date(),
            notes: notes
        }).where(and(eq(shifts.id, shiftId), eq(shifts.tenantId, tenantId)));

        // --- Auto-Journal for Discrepancy ---
        const discrepancy = actualCash - expectedCash;
        if (Math.abs(discrepancy) > 0.01) {
            const { getDictionary } = await import("@/lib/i18n-server");
            const dict = await getDictionary();
            const { accounts } = await import("@/db/schema");
            const { or, like } = await import("drizzle-orm");

            // Find Treasury Account
            const cashAccountRows = await db.select().from(accounts).where(and(
                eq(accounts.tenantId, tenantId),
                or(like(accounts.code, '101%'), like(accounts.code, '1101%'), like(accounts.name, '%Cash%'), like(accounts.name, '%الصندوق%'))
            )).limit(1);
            const treasuryId = cashAccountRows[0]?.id;

            // Find or Create Over/Short Account (Expense/Revenue)
            let overShortAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '5105'))
            });

            if (!overShortAcc) {
                const [newAcc] = await db.insert(accounts).values({
                    tenantId,
                    name: dict.Accounting.SystemAccounts.CashOverShort || "Cash Over/Short",
                    code: '5105',
                    type: 'expense', // Normally treated as expense (shortage), translates to revenue if credit (overage)
                    balance: '0',
                    isActive: true
                }).returning();
                overShortAcc = newAcc;
            }

            if (treasuryId && overShortAcc) {
                const { createJournalEntry } = await import("@/features/accounting/actions");
                const { getSettings } = await import("@/features/settings/actions");
                const settings = await getSettings();

                const lines = [];
                const descMap = (dict.Accounting.Journal as any)?.ShiftDiscrepancy || "Shift #{number} Discrepancy";
                const description = descMap.replace("{number}", shift.shiftNumber.toString());

                if (discrepancy < 0) {
                    // Shortage (Deficit): Cash is less than expected.
                    // Debit: Over/Short Expense (Increase Expense)
                    // Credit: Cash (Reduce Cash to match reality)
                    const absDiff = Math.abs(discrepancy);
                    lines.push({ accountId: overShortAcc.id, debit: absDiff, credit: 0, description });
                    lines.push({ accountId: treasuryId, debit: 0, credit: absDiff, description });
                } else {
                    // Overage (Surplus): Cash is more than expected.
                    // Debit: Cash (Increase Cash to match reality)
                    // Credit: Over/Short (Increase Revenue/Contra-Expense)
                    lines.push({ accountId: treasuryId, debit: discrepancy, credit: 0, description });
                    lines.push({ accountId: overShortAcc.id, debit: 0, credit: discrepancy, description });
                }

                await createJournalEntry({
                    date: new Date().toISOString().split('T')[0],
                    reference: `SHIFT-${shift.shiftNumber}`,
                    description: description,
                    currency: settings?.currency || "EGP",
                    lines: lines
                });
            } else {
                console.warn("Could not find required accounts for shift discrepancy journal");
            }
        }

        return { success: true };
    } catch (e: any) {
        console.error("Error closing shift:", e);
        return { success: false, message: e.message };
    }
}
