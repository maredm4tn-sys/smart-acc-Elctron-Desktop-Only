"use client";

import { useState, useTransition } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Num } from "@/components/ui/num";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, UserPlus, Loader2, ArrowRightLeft } from "lucide-react";
import Link from "next/link";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upsertEmployee, deleteEmployee } from "@/features/employees/actions";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/export-excel";
import { BulkImportEmployeesDialog } from "./bulk-import-dialog";

export function EmployeeList({ initialEmployees, dict }: { initialEmployees: any[], dict: any }) {
    const [employees, setEmployees] = useState(initialEmployees);
    const [open, setOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            id: editingEmployee?.id,
            code: formData.get("code") as string,
            name: formData.get("name") as string,
            address: formData.get("address") as string,
            phone: formData.get("phone") as string,
            email: formData.get("email") as string,
            basicSalary: formData.get("basicSalary") as string,
            notes: formData.get("notes") as string,
        };

        const res = await upsertEmployee(data);
        if (res.success) {
            toast.success(dict.Employees.Form.Success);
            setOpen(false);
            setEditingEmployee(null);
            window.location.reload();
        } else {
            toast.error(res.message || dict.Common.Error);
        }
    };

    const handleDelete = (id: number) => {
        if (confirm(dict.Employees.DeleteConfirm)) {
            startTransition(async () => {
                const res = await deleteEmployee(id);
                if (res.success) {
                    toast.success(dict.Employees.DeleteSuccess);
                    window.location.reload();
                }
                else toast.error(dict.Employees.DeleteError);
            });
        }
    };

    const handleEdit = (emp: any) => {
        setEditingEmployee(emp);
        setOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="w-full">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">{dict.Employees.Title}</h1>
                    <p className="text-slate-500 mt-1">{dict.Employees.Description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-end">
                    <BulkImportEmployeesDialog />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(employees, 'Employees', 'EmployeesList')}
                        className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold gap-2 shadow-sm rounded-xl h-10 px-4"
                    >
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                        <span className="hidden sm:inline">{dict.Employees.ExportExcel}</span>
                    </Button>

                    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingEmployee(null); }}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2 shadow-md rounded-xl h-10 px-4 transition-all hover:scale-105 active:scale-95">
                                <Plus size={18} />
                                {dict.Employees.NewEmployee}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px]" dir={dict.Common.Direction as any}>
                            <DialogHeader>
                                <DialogTitle>{dict.Employees.Form.Title}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {editingEmployee?.id && <input type="hidden" name="id" value={editingEmployee.id} />}
                                <Tabs defaultValue="personal" className="w-full" dir={dict.Common.Direction as any}>
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="personal">{dict.Employees.Form.PersonalData}</TabsTrigger>
                                        <TabsTrigger value="salary">{dict.Employees.Form.SalaryData}</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="personal" forceMount className="data-[state=inactive]:hidden space-y-4 pt-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="name">{dict.Employees.Form.Name}</Label>
                                                <Input id="name" name="name" defaultValue={editingEmployee?.name} placeholder={dict.Employees.Form.Placeholders.Name} required />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="code">{dict.Employees.Form.Code}</Label>
                                                <Input
                                                    id="code"
                                                    name="code"
                                                    defaultValue={editingEmployee?.code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`}
                                                    placeholder={dict.Employees.Form.Placeholders.Code}
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="phone">{dict.Employees.Form.Phone}</Label>
                                                <Input id="phone" name="phone" defaultValue={editingEmployee?.phone || ""} placeholder={dict.Employees.Form.Placeholders.Phone} dir="ltr" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="address">{dict.Employees.Form.Address}</Label>
                                                <Input id="address" name="address" defaultValue={editingEmployee?.address || ""} placeholder={dict.Employees.Form.Placeholders.Address} />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email">{dict.Employees.Form.Email}</Label>
                                            <Input id="email" name="email" type="email" defaultValue={editingEmployee?.email || ""} placeholder={dict.Employees.Form.Placeholders.Email} dir="ltr" />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="salary" forceMount className="data-[state=inactive]:hidden space-y-4 pt-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="basicSalary">{dict.Employees.Form.BasicSalary}</Label>
                                            <Input id="basicSalary" name="basicSalary" type="number" step="0.01" defaultValue={editingEmployee?.basicSalary || 0} required />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="notes">{dict.Employees.Form.Notes}</Label>
                                            <Textarea id="notes" name="notes" defaultValue={editingEmployee?.notes || ""} placeholder={dict.Employees.Form.Placeholders.Notes} />
                                        </div>
                                    </TabsContent>
                                </Tabs>
                                <div className="flex justify-end gap-2 p-2">
                                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl">
                                        {dict.Employees.Form.Cancel}
                                    </Button>
                                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl">
                                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {dict.Employees.Form.Save}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden rounded-2xl">
                <CardHeader className="pb-4 bg-slate-50/50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                        <UserPlus className="h-5 w-5 text-blue-600" />
                        {dict.Employees.Tabs.List}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-start font-bold text-slate-900 w-24">{dict.Employees.Table.Code}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Table.Name}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Form.Phone}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-900 hidden md:table-cell">{dict.Employees.Form.Address}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Table.Salary}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-900">{dict.Common.Actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {employees.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-40 text-slate-400 font-medium">
                                            <div className="flex flex-col items-center gap-2">
                                                <UserPlus className="h-8 w-8 opacity-20" />
                                                {dict.Employees.Empty}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    employees.map((emp) => (
                                        <TableRow key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-start font-mono text-xs tabular-nums text-slate-500">
                                                <Link href={`/dashboard/employees/${emp.id}`} className="hover:text-blue-600 transition-colors">
                                                    <Num value={emp.code} />
                                                </Link>
                                            </TableCell>
                                            <TableCell className="text-start font-bold text-slate-700">{emp.name}</TableCell>
                                            <TableCell className="text-start font-mono text-xs tabular-nums text-slate-600">
                                                <Num value={emp.phone || "-"} />
                                            </TableCell>
                                            <TableCell className="text-start text-xs text-slate-500 hidden md:table-cell max-w-xs truncate">
                                                {emp.address || "-"}
                                            </TableCell>
                                            <TableCell className="text-start font-bold text-emerald-600 font-mono tabular-nums">
                                                <Num value={Number(emp.basicSalary)} precision={2} showGrouping={true} />
                                            </TableCell>
                                            <TableCell className="text-start">
                                                <div className="flex justify-start gap-1">
                                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
