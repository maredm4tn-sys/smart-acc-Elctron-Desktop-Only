"use server";

import { db, withErrorHandling } from "@/db";
import { employees, attendance, advances, payrolls, accounts } from "@/db/schema";
import { eq, and, desc, sql, like } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";
import { createJournalEntry, createAccount } from "@/features/accounting/actions";
import { getDictionary } from "@/lib/i18n-server";

const loadDictionary = async () => {
    return await getDictionary();
};

const DEFAULT_TENANT_ID = 'tenant_default';

async function getContext() {
    try {
        const session = await requireSession();
        return { tenantId: session.tenantId || DEFAULT_TENANT_ID };
    } catch (e) {
        return { tenantId: DEFAULT_TENANT_ID };
    }
}

export async function getEmployees() {
    try {
        const { tenantId } = await getContext();
        const data = await db.select().from(employees)
            .where(eq(employees.tenantId, tenantId))
            .orderBy(desc(employees.createdAt));
        return data;
    } catch (error: any) { return []; }
}

export async function upsertEmployee(data: any) {
    const result = await withErrorHandling("upsertEmployee", async () => {
        const { tenantId } = await getContext();

        let employeeCode = data.code;
        if (!employeeCode || employeeCode.trim() === "") {
            // Auto-generate code if missing
            employeeCode = `EMP-${Math.floor(1000 + Math.random() * 9000)}`;
        }

        const employeeData = {
            code: employeeCode,
            name: data.name || (await loadDictionary()).Common.New,
            address: data.address,
            phone: data.phone,
            email: data.email,
            basicSalary: String(data.basicSalary || '0.00'),
            status: data.status || 'active',
            notes: data.notes,
            tenantId: tenantId
        };

        if (data.id) {
            await db.update(employees).set(employeeData).where(and(eq(employees.id, data.id), eq(employees.tenantId, tenantId)));
        } else {
            await db.insert(employees).values(employeeData);
        }
        return true;
    });
    return result;
}

export async function deleteEmployee(id: number) {
    const result = await withErrorHandling("deleteEmployee", async () => {
        const { tenantId } = await getContext();
        await db.delete(employees).where(and(eq(employees.id, id), eq(employees.tenantId, tenantId)));
        return true;
    });
    return result;
}

export async function createAdvance(data: any) {
    return await withErrorHandling("createAdvance", async () => {
        const { tenantId } = await getContext();

        // 1. Record Advance in DB
        const [newAdvance] = await db.insert(advances).values({ ...data, tenantId }).returning();

        // 2. [ACCOUNTING] Create Journal Entry
        try {
            // Find or Create 'Employee Advances' Account (Asset - 1106)
            let advanceAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1106'))
            });

            if (!advanceAcc) {
                // Try finding by name
                advanceAcc = await db.query.accounts.findFirst({
                    where: and(eq(accounts.tenantId, tenantId), like(accounts.name, '%Advance%'))
                });
            }

            if (!advanceAcc) {
                // Create it if totally missing
                const parent = await db.query.accounts.findFirst({
                    where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '11'))
                });
                const res = await createAccount({
                    code: '1106',
                    name: (await loadDictionary()).Accounting.SystemAccounts.EmployeeAdvances,
                    type: 'asset',
                    parentId: parent?.id
                });
                if (res.success) {
                    advanceAcc = await db.query.accounts.findFirst({
                        where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1106'))
                    });
                }
            }

            if (advanceAcc && data.treasuryAccountId) {
                const amount = Number(data.amount);
                const isAdvance = data.type === 'advance';

                const dict = await loadDictionary();
                await createJournalEntry({
                    date: data.date,
                    description: `${isAdvance ? dict.Sidebar.Employees.Advances.Disbursement : dict.Sidebar.Employees.Advances.Repayment} - ${data.notes || ''}`,
                    reference: `ADV-${newAdvance.id}`,
                    lines: [
                        {
                            accountId: advanceAcc.id,
                            debit: isAdvance ? amount : 0,
                            credit: isAdvance ? 0 : amount,
                            description: `${dict.Accounting.SystemAccounts.EmployeeAdvances} - ID: ${data.employeeId}`
                        },
                        {
                            accountId: data.treasuryAccountId,
                            debit: isAdvance ? 0 : amount,
                            credit: isAdvance ? amount : 0,
                            description: isAdvance ? dict.Accounting.Journal.TreasuryDisbursement : dict.Accounting.Journal.TreasuryDeposit
                        }
                    ]
                });
            }
        } catch (accErr) {
            console.error("Accounting Link Error (Advance):", accErr);
        }

        return true;
    });
}

export async function recordAttendance(data: any) {
    const result = await withErrorHandling("recordAttendance", async () => {
        const { tenantId } = await getContext();
        const existing = await db.select().from(attendance).where(and(eq(attendance.employeeId, data.employeeId), eq(attendance.date, data.date))).limit(1);
        if (existing[0]) {
            await db.update(attendance).set(data).where(eq(attendance.id, existing[0].id));
        } else {
            await db.insert(attendance).values({ ...data, tenantId });
        }
        return true;
    });
    return result;
}

export async function processPayroll(data: any) {
    return await withErrorHandling("processPayroll", async () => {
        const { tenantId } = await getContext();

        // 1. Record Payroll in DB
        const [newPayroll] = await db.insert(payrolls).values({ ...data, tenantId }).returning();

        // 2. [ACCOUNTING] Create Journal Entry
        try {
            // Find 'Salaries Expense' Account (5202)
            let salaryExpAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '5202'))
            });

            // Find 'Employee Advances' Account (1106)
            const advanceAcc = await db.query.accounts.findFirst({
                where: and(eq(accounts.tenantId, tenantId), eq(accounts.code, '1106'))
            });

            if (salaryExpAcc && data.treasuryAccountId) {
                const netSalary = Number(data.netSalary);
                const basic = Number(data.basicSalary);
                const incentives = Number(data.incentives || 0);
                const deductions = Number(data.deductions || 0);
                const advDed = Number(data.advanceDeductions || 0);

                const dict = await loadDictionary();
                const lines = [
                    {
                        accountId: salaryExpAcc.id,
                        debit: basic + incentives - deductions,
                        credit: 0,
                        description: `${dict.Sidebar.Employees.Payroll.SalaryMonth}: ${data.salaryMonth}`
                    },
                    {
                        accountId: data.treasuryAccountId,
                        debit: 0,
                        credit: netSalary,
                        description: dict.Accounting.Journal.TreasuryDisbursement
                    }
                ];

                // If advances were deducted, credit the advances account
                if (advDed > 0 && advanceAcc) {
                    lines.push({
                        accountId: advanceAcc.id,
                        debit: 0,
                        credit: advDed,
                        description: dict.Sidebar.Employees.Payroll.AdvanceDeduction
                    });

                    // Also mark the advances as 'deducted' in advances table
                    await db.update(advances)
                        .set({ status: 'deducted' })
                        .where(and(
                            eq(advances.employeeId, data.employeeId),
                            eq(advances.tenantId, tenantId),
                            eq(advances.status, 'pending'),
                            eq(advances.salaryMonth, data.salaryMonth)
                        ));
                }

                await createJournalEntry({
                    date: data.paymentDate,
                    description: `${dict.Sidebar.Employees.Payroll.Title} - ${data.notes || ''}`,
                    reference: `PAY-${newPayroll.id}`,
                    lines: lines
                });
            }
        } catch (accErr) {
            console.error("Accounting Link Error (Payroll):", accErr);
        }

        return true;
    });
}

export async function getPendingAdvances(employeeId: number) {
    try {
        const { tenantId } = await getContext();
        const data = await db.select().from(advances)
            .where(and(
                eq(advances.employeeId, employeeId),
                eq(advances.tenantId, tenantId),
                eq(advances.type, 'advance'),
                eq(advances.status, 'pending')
            ));
        return data;
    } catch (e) {
        return [];
    }
}

export async function getAttendance(date: string) {
    try {
        const { tenantId } = await getContext();
        const data = await db.select().from(attendance).where(and(eq(attendance.tenantId, tenantId), eq(attendance.date, date)));
        return data;
    } catch (e) { return []; }
}

export async function getEmployeeStatement(employeeId: number, startDate: string, endDate: string) {
    try {
        const { tenantId } = await getContext();

        const employeePayrolls = await db.select().from(payrolls)
            .where(and(
                eq(payrolls.employeeId, employeeId),
                eq(payrolls.tenantId, tenantId),
                sql`CAST(${payrolls.paymentDate} AS DATE) >= CAST(${startDate} AS DATE)`,
                sql`CAST(${payrolls.paymentDate} AS DATE) <= CAST(${endDate} AS DATE)`
            ))
            .orderBy(desc(payrolls.paymentDate));

        const employeeAdvances = await db.select().from(advances)
            .where(and(
                eq(advances.employeeId, employeeId),
                eq(advances.tenantId, tenantId),
                sql`CAST(${advances.date} AS DATE) >= CAST(${startDate} AS DATE)`,
                sql`CAST(${advances.date} AS DATE) <= CAST(${endDate} AS DATE)`
            ))
            .orderBy(desc(advances.date));

        const summary = {
            totalBasic: employeePayrolls.reduce((s, p) => s + Number(p.basicSalary), 0),
            totalIncentives: employeePayrolls.reduce((s, p) => s + Number(p.incentives || 0), 0),
            totalDeductions: employeePayrolls.reduce((s, p) => s + Number(p.deductions || 0), 0),
            totalAdvanceDed: employeePayrolls.reduce((s, p) => s + Number(p.advanceDeductions || 0), 0),
            totalNet: employeePayrolls.reduce((s, p) => s + Number(p.netSalary), 0),
            openAdvances: employeeAdvances.filter(a => a.status === 'pending' && a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0),
            totalAdvances: employeeAdvances.filter(a => a.type === 'advance').reduce((s, a) => s + Number(a.amount), 0),
            totalRepayments: employeeAdvances.filter(a => a.type === 'repayment').reduce((s, a) => s + Number(a.amount), 0),
        };

        return {
            payrolls: employeePayrolls,
            advances: employeeAdvances,
            summary
        };
    } catch (error) {
        return { payrolls: [], advances: [], summary: null };
    }
}
