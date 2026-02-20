import { getEmployeeStatement, getEmployees } from "@/features/employees/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PrintEmployeeReport({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ start?: string, end?: string, type?: string }>
}) {
    const { id } = await params;
    const { start, end, type = 'all' } = await searchParams;

    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as any;

    // In print mode, if dates are missing, we use current month or wide range
    const startDate = start || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    const endDate = end || new Date().toISOString().split('T')[0];

    const data = await getEmployeeStatement(Number(id), startDate, endDate);
    const employees = await getEmployees();
    const employee = employees.find(e => e.id === Number(id));

    if (!data || !employee) return <div className="p-10 text-center">Error loading report data</div>;

    const { payrolls, advances, summary } = data;

    return (
        <div className="p-10 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Reports.Statements.Employees}</h1>
                    <h2 className="text-2xl font-black text-blue-700">{employee.name}</h2>
                    <div className="text-slate-500 text-sm mt-2 flex gap-4">
                        <span>{dict.Employees?.Report?.Print?.From} {startDate}</span>
                        <span>{dict.Employees?.Report?.Print?.To} {endDate}</span>
                    </div>
                </div>
                <div className="text-left">
                    <h2 className="text-xl font-bold">Smart Accountant</h2>
                    <p className="text-xs text-muted-foreground">{dict.Employees?.Report?.Print?.Title}</p>
                    <p className="text-[10px] mt-1">{dict.Employees?.Report?.Print?.PrintDate} {new Date().toLocaleDateString('en-GB')}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4 mb-10 border p-4 rounded-xl bg-slate-50">
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Employees?.Report?.Print?.TotalBasic}</p>
                    <p className="text-lg font-black">{formatCurrency(summary.totalBasic, currency)}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Employees?.Report?.Print?.TotalIncentives}</p>
                    <p className="text-lg font-black text-green-600">+{formatCurrency(summary.totalIncentives, currency)}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Employees?.Report?.Print?.TotalDeductions}</p>
                    <p className="text-lg font-black text-red-600">-{formatCurrency(summary.totalDeductions + summary.totalAdvanceDed, currency)}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Employees?.Report?.Print?.NetDisbursed}</p>
                    <p className="text-lg font-black text-blue-700">{formatCurrency(summary.totalNet, currency)}</p>
                </div>
            </div>

            {/* Payrolls Table */}
            {(type === 'all' || type === 'payroll') && (
                <div className="mb-10">
                    <h3 className="font-bold text-slate-700 mb-4 border-r-4 border-blue-500 pr-2">{dict.Employees?.Report?.Print?.PayrollRecords}</h3>
                    <Table className="border rounded-lg">
                        <TableHeader className="bg-slate-100">
                            <TableRow>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Date}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Month}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Basic}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Incentives}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Deductions}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.AdvanceDeduction}</TableHead>
                                <TableHead className="text-center font-bold text-blue-700">{dict.Employees?.Report?.Print?.Table?.Net}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {payrolls.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center">{dict.Employees?.Report?.Print?.NoData}</TableCell></TableRow>
                            ) : (
                                payrolls.map((p: any) => (
                                    <TableRow key={p.id}>
                                        <TableCell className="text-center">{p.paymentDate}</TableCell>
                                        <TableCell className="text-center">{p.salaryMonth}</TableCell>
                                        <TableCell className="text-center font-mono">{formatCurrency(p.basicSalary, currency)}</TableCell>
                                        <TableCell className="text-center font-mono text-green-600">+{formatCurrency(p.incentives, currency)}</TableCell>
                                        <TableCell className="text-center font-mono text-red-500">-{formatCurrency(p.deductions, currency)}</TableCell>
                                        <TableCell className="text-center font-mono text-orange-600">-{formatCurrency(p.advanceDeductions, currency)}</TableCell>
                                        <TableCell className="text-center font-mono font-bold">{formatCurrency(p.netSalary, currency)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Advances Table */}
            {(type === 'all' || type === 'advances') && (
                <div className="mb-10">
                    <h3 className="font-bold text-slate-700 mb-4 border-r-4 border-orange-500 pr-2">{dict.Employees?.Report?.Print?.AdvancesRecords}</h3>
                    <Table className="border rounded-lg">
                        <TableHeader className="bg-slate-100">
                            <TableRow>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Date}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Type}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Amount}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.DeductionMonth}</TableHead>
                                <TableHead className="text-center">{dict.Employees?.Report?.Print?.Table?.Status}</TableHead>
                                <TableHead className="text-right">{dict.Employees?.Report?.Print?.Table?.Notes}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {advances.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="text-center">{dict.Employees?.Report?.Print?.NoData}</TableCell></TableRow>
                            ) : (
                                advances.map((a: any) => (
                                    <TableRow key={a.id}>
                                        <TableCell className="text-center font-mono">{a.date}</TableCell>
                                        <TableCell className="text-center">{a.type === 'advance' ? dict.Employees?.Report?.Print?.AdvanceTypeDisburse : dict.Employees?.Report?.Print?.AdvanceTypeRepay}</TableCell>
                                        <TableCell className={`text-center font-mono font-bold ${a.type === 'advance' ? 'text-orange-700' : 'text-green-700'}`}>{formatCurrency(a.amount, currency)}</TableCell>
                                        <TableCell className="text-center">{a.salaryMonth}</TableCell>
                                        <TableCell className="text-center">{a.status === 'deducted' ? dict.Employees?.Report?.Print?.StatusDeducted : dict.Employees?.Report?.Print?.StatusOpen}</TableCell>
                                        <TableCell className="text-right text-xs">{a.notes || "-"}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Footer */}
            <div className="mt-20 flex justify-between items-end border-t pt-10 px-10">
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Employees?.Report?.Print?.EmpSignature}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Employees?.Report?.Print?.ReviewApproval}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Employees?.Report?.Print?.FacilityStamp}</p>
                    <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
