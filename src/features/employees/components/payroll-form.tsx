"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Save, Wallet } from "lucide-react";
import { toast } from "sonner";
import { processPayroll, getPendingAdvances } from "@/features/employees/actions";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";

import { TranslationKeys } from "@/lib/translation-types";

export function PayrollForm({ employees, dict }: { employees: any[], dict: TranslationKeys }) {
    const { currency } = useSettings();
    const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
    const [salaryMonth, setSalaryMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [basicSalary, setBasicSalary] = useState(0);
    const [incentives, setIncentives] = useState(0);
    const [deductions, setDeductions] = useState(0);
    const [advanceDeductions, setAdvanceDeductions] = useState(0);
    const [treasuries, setTreasuries] = useState<any[]>([]);
    const [selectedTreasury, setSelectedTreasury] = useState("");
    const [notes, setNotes] = useState("");
    const [pendingAdvances, setPendingAdvances] = useState<any[]>([]);
    const [totalPendingAdvance, setTotalPendingAdvance] = useState(0);

    useEffect(() => {
        const fetchTreasuries = async () => {
            const { getTreasuryAccounts } = await import("@/features/accounting/actions");
            const data = await getTreasuryAccounts();
            setTreasuries(data);
            if (data.length > 0) setSelectedTreasury(data[0].id.toString());
        };
        fetchTreasuries();
    }, []);

    const handleEmployeeChange = async (id: string) => {
        const emp = employees.find(e => e.id.toString() === id);
        setSelectedEmployee(emp);
        if (emp) {
            setBasicSalary(Number(emp.basicSalary));

            // Fetch pending advances
            const advances = await getPendingAdvances(emp.id);
            setPendingAdvances(advances);
            const total = advances.reduce((sum, adv) => sum + Number(adv.amount), 0);
            setTotalPendingAdvance(total);
            setAdvanceDeductions(total); // Default to full deduction
        }
    };

    const netSalary = basicSalary + incentives - deductions - advanceDeductions;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedTreasury) {
            toast.error(dict.Payroll.Error);
            return;
        }

        const res = await processPayroll({
            employeeId: selectedEmployee.id,
            paymentDate: new Date().toISOString().split('T')[0],
            salaryMonth,
            basicSalary: basicSalary.toString(),
            incentives: incentives.toString(),
            deductions: deductions.toString(),
            advanceDeductions: advanceDeductions.toString(),
            netSalary: netSalary.toString(),
            treasuryAccountId: parseInt(selectedTreasury),
            notes: notes
        });

        if (res.success) {
            toast.success(dict.Payroll.Success);
            window.location.reload();
        } else {
            toast.error(res.message || dict.Common.Error);
        }
    };

    return (
        <Card className="border-none shadow-md max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-primary" />
                    {dict.Payroll.Title}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <Label>{dict.Employees.Table.Name}</Label>
                            <Select onValueChange={handleEmployeeChange}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Payroll.SelectEmployee} />
                                </SelectTrigger>
                                <SelectContent>
                                    {employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Payroll.Month}</Label>
                            <Input type="month" value={salaryMonth} onChange={(e) => setSalaryMonth(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Payroll.PaymentDate}</Label>
                            <Input type="date" defaultValue={new Date().toISOString().split('T')[0]} readOnly />
                        </div>
                    </div>

                    {totalPendingAdvance > 0 && (
                        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                            <div className="flex items-center gap-3">
                                <div className="bg-orange-100 p-2 rounded-full">
                                    <Wallet className="h-4 w-4 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-orange-900">{dict.Payroll.PendingAdvances}</p>
                                    <p className="text-xs text-orange-700">{dict.Payroll.TotalAdvances}: {formatCurrency(totalPendingAdvance, currency)}</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="border-orange-200 text-orange-700 hover:bg-orange-100"
                                onClick={() => setAdvanceDeductions(totalPendingAdvance)}
                            >
                                {dict.Payroll.DeductAll}
                            </Button>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 p-4 bg-slate-50 rounded-lg">
                        <div className="space-y-2">
                            <Label className="text-slate-500">{dict.Payroll.Basic}</Label>
                            <Input type="number" value={basicSalary} onChange={(e) => setBasicSalary(Number(e.target.value))} className="font-mono font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-green-600">{dict.Payroll.Incentives}</Label>
                            <Input type="number" value={incentives} onChange={(e) => setIncentives(Number(e.target.value))} className="font-mono font-bold text-green-600" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-red-500">{dict.Payroll.Deductions}</Label>
                            <Input type="number" value={deductions} onChange={(e) => setDeductions(Number(e.target.value))} className="font-mono font-bold text-red-500" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-orange-600">{dict.Payroll.AdvanceDed}</Label>
                            <Input type="number" value={advanceDeductions} onChange={(e) => setAdvanceDeductions(Number(e.target.value))} className="font-mono font-bold text-orange-600" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Employees.Form.Notes}</Label>
                        <Textarea name="notes" placeholder={dict.Payroll.NotesPlaceholder} className="min-h-[100px]" value={notes} onChange={(e) => setNotes(e.target.value)} />
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 bg-blue-50 rounded-xl border-2 border-blue-100">
                        <div className="space-y-2 w-full md:w-1/3">
                            <Label>{dict.Payroll.Treasury}</Label>
                            <Select onValueChange={setSelectedTreasury} value={selectedTreasury}>
                                <SelectTrigger className="bg-white">
                                    <SelectValue placeholder={dict.Payroll.SelectTreasury} />
                                </SelectTrigger>
                                <SelectContent>
                                    {treasuries.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-center md:text-left">
                            <p className="text-sm text-blue-600 font-bold mb-1">{dict.Payroll.Net}</p>
                            <p className="text-4xl font-black text-blue-900 font-mono">
                                {formatCurrency(netSalary, currency)}
                            </p>
                        </div>

                        <Button type="submit" size="lg" className="h-16 px-10 text-lg gap-2 shadow-lg shadow-blue-200">
                            <Save size={20} />
                            {dict.Payroll.Process}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
