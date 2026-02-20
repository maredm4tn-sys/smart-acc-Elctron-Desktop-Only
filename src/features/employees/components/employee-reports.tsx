"use client";

import { useState, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Search, Printer, History } from "lucide-react";
import { getEmployeeStatement } from "@/features/employees/actions";
import { formatCurrency } from "@/lib/utils";

export function EmployeeReports({ employees, dict, currency = "EGP" }: { employees: any[], dict: any, currency?: string }) {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [reportType, setReportType] = useState("all");
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `${dict.Reports.Statements.Employees} - ${employees.find(e => e.id.toString() === selectedEmployee)?.name || ""}`,
    });

    const handleSearch = async () => {
        if (!selectedEmployee) return;
        setLoading(true);
        const res = await getEmployeeStatement(parseInt(selectedEmployee), startDate, endDate);
        setData(res);
        setLoading(false);
    };

    const currentEmployeeName = employees.find(e => e.id.toString() === selectedEmployee)?.name || "";
    const payrollData = data?.payrolls || [];
    const advancesData = data?.advances || [];

    return (
        <div className="space-y-6">
            {/* Filter Section */}
            <Card className="border-none shadow-sm no-print">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Search className="h-5 w-5 text-blue-600" />
                        {dict.Reports.Statements.Filter}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div className="md:col-span-1 space-y-2 text-start">
                            <Label>{dict.Employees.Table.Name}</Label>
                            <Select onValueChange={setSelectedEmployee} value={selectedEmployee}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Payroll?.SelectEmployee} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2 text-start">
                            <Label>{dict.Reports?.IncomeStatement?.FromDate}</Label>
                            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-2 text-start">
                            <Label>{dict.Reports?.IncomeStatement?.ToDate}</Label>
                            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </div>
                        <div className="space-y-2 text-start">
                            <Label>{dict.Reports?.Type}</Label>
                            <Select value={reportType} onValueChange={setReportType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{dict.Common.All}</SelectItem>
                                    <SelectItem value="payroll">{dict.Employees.Tabs.Payroll}</SelectItem>
                                    <SelectItem value="advances">{dict.Employees.Tabs.Advances}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="gap-2 h-10" onClick={handleSearch} disabled={loading || !selectedEmployee}>
                            <Search size={18} />
                            {dict.Reports?.IncomeStatement?.ShowReport}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Results Section */}
            {data && (
                <div className="space-y-6">
                    <div className="flex justify-end no-print">
                        <Button
                            variant="outline"
                            className="gap-2"
                            onClick={() => handlePrint()}
                        >
                            <Printer className="h-4 w-4" />
                            {dict.Suppliers?.Statement?.Print}
                        </Button>
                    </div>

                    <div ref={printRef} className="space-y-8 print:p-8" dir="rtl">
                        {/* Print Header */}
                        <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8 text-start">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900">{dict.Common.AppName}</h1>
                                <p className="text-sm font-bold text-slate-600 mt-1">{dict.Reports.Statements.Employees}</p>
                            </div>
                            <div className="text-end">
                                <p className="text-xl font-bold">{currentEmployeeName}</p>
                                <p className="text-sm text-slate-500 font-mono tabular-nums">
                                    {startDate} - {endDate}
                                </p>
                            </div>
                        </div>

                        {/* Summary Cards (Only show in UI) */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 no-print text-start">
                            <Card className="bg-blue-50/30 border-blue-100 shadow-none">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
                                            <ClipboardList className="h-6 w-6" />
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">{dict.Employees.Form.BasicSalary}</p>
                                            <p className="text-2xl font-bold font-mono tabular-nums">
                                                {formatCurrency(Number(employees.find(e => e.id.toString() === selectedEmployee)?.basicSalary || 0), currency)}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Payroll Table */}
                        {(reportType === 'all' || reportType === 'payroll') && (
                            <Card className="border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <History className="h-4 w-4 text-slate-500" />
                                        {dict.Employees.Tabs.Payroll}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-start font-bold">{dict.Journal.Table.Date}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Payroll.Month}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Payroll.Net}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Payroll.Notes}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {payrollData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-slate-400 italic">
                                                        {dict.Common.NoData}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                payrollData.map((p: any) => (
                                                    <TableRow key={p.id}>
                                                        <TableCell className="text-start font-mono text-xs tabular-nums">{p.paymentDate}</TableCell>
                                                        <TableCell className="text-start font-bold">{p.salaryMonth}</TableCell>
                                                        <TableCell className="text-start font-bold text-blue-700 font-mono tabular-nums">
                                                            {formatCurrency(p.netSalary, currency)}
                                                        </TableCell>
                                                        <TableCell className="text-start text-xs text-slate-500">{p.notes || "-"}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Advances Table */}
                        {(reportType === 'all' || reportType === 'advances') && (
                            <Card className="border-slate-200">
                                <CardHeader className="bg-slate-50/50 border-b">
                                    <CardTitle className="text-base font-bold flex items-center gap-2">
                                        <ClipboardList className="h-4 w-4 text-orange-500" />
                                        {dict.Employees.Tabs.Advances}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <Table>
                                        <TableHeader className="bg-slate-50/50">
                                            <TableRow>
                                                <TableHead className="text-start font-bold">{dict.Journal.Table.Date}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Advances.Type}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Advances.Amount}</TableHead>
                                                <TableHead className="text-start font-bold">{dict.Employees.Table.Status}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {advancesData.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={4} className="text-center py-8 text-slate-400 italic">
                                                        {dict.Common.NoData}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                advancesData.map((a: any) => (
                                                    <TableRow key={a.id}>
                                                        <TableCell className="text-start font-mono text-xs tabular-nums">{a.date}</TableCell>
                                                        <TableCell className="text-start">
                                                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${a.type === 'advance' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                                                                {a.type === 'advance' ? (dict.Advances?.Types?.Advance) : (dict.Advances?.Types?.Repayment)}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className={`text-start font-bold font-mono tabular-nums ${a.type === 'advance' ? 'text-orange-700' : 'text-green-700'}`}>
                                                            {formatCurrency(a.amount, currency)}
                                                        </TableCell>
                                                        <TableCell className="text-start">
                                                            <span className={`text-[10px] ${a.status === 'deducted' ? 'text-gray-400' : 'text-blue-600 font-bold'}`}>
                                                                {a.status === 'deducted' ? (dict.Advances?.Status?.Deducted) : (dict.Advances?.Status?.Pending)}
                                                            </span>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        )}

                        {/* Print Footer */}
                        <div className="hidden print:flex justify-between items-end mt-20 pt-10 border-t">
                            <div className="text-center">
                                <p className="font-bold underline mb-10">{dict.PrintSettings?.AccountantSignature}</p>
                                <p className="text-slate-300">..............................</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold underline mb-10">{dict.PrintSettings?.ReviewSignature}</p>
                                <p className="text-slate-300">..............................</p>
                            </div>
                            <div className="text-center">
                                <p className="font-bold underline mb-10">{dict.PrintSettings?.Stamp}</p>
                                <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
