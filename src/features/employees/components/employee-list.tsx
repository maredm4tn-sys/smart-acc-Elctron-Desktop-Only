"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Num } from "@/components/ui/num";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, UserPlus, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { upsertEmployee, deleteEmployee } from "@/features/employees/actions";
import { toast } from "sonner";
import { useTransition } from "react";

import { TranslationKeys } from "@/lib/translation-types";

export function EmployeeList({ initialEmployees, dict }: { initialEmployees: any[], dict: TranslationKeys }) {
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
                    window.location.reload(); // Keep reload for now as per original logic
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
        <Card className="border-none shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-primary" />
                    {dict.Employees.Tabs.List}
                </CardTitle>
                <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (!val) setEditingEmployee(null); }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2">
                            <Plus size={16} />
                            {dict.Employees.NewEmployee}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]" dir={dict.Common.Direction as any}>
                        <DialogHeader>
                            <DialogTitle>{dict.Employees.Form.Title}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4"> {/* Changed action to onSubmit */}
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
                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}> {/* Changed onOpenChange to setOpen */}
                                    {dict.Employees.Form.Cancel}
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    {dict.Employees.Form.Save}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Table.Code}</TableHead>
                                <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Table.Name}</TableHead>
                                <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Form.Phone}</TableHead>
                                <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Form.Address}</TableHead>
                                <TableHead className="text-start font-bold text-slate-900">{dict.Employees.Table.Salary}</TableHead>
                                <TableHead className="text-center font-bold text-slate-900 italic">{dict.Common.Actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-gray-500">{dict.Employees.Empty}</TableCell>
                                </TableRow>
                            ) : (
                                employees.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-slate-50/50">
                                        <TableCell className="text-start font-mono text-xs tabular-nums">
                                            <Num value={emp.code} />
                                        </TableCell>
                                        <TableCell className="text-start font-bold text-slate-700">{emp.name}</TableCell>
                                        <TableCell className="text-start font-mono text-xs tabular-nums">
                                            <Num value={emp.phone || "-"} />
                                        </TableCell>
                                        <TableCell className="text-start text-xs text-slate-500">{emp.address || "-"}</TableCell>
                                        <TableCell className="text-start font-bold text-blue-600 font-mono tabular-nums">
                                            <Num value={Number(emp.basicSalary)} precision={2} showGrouping={true} />
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center gap-2">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(emp)} className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)} className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50">
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
    );
}
