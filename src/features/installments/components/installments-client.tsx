"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Calendar, Search, CheckCircle2, AlertCircle, Clock, Wallet } from "lucide-react";
import { payInstallment } from "../actions";
import { getInvoiceItems } from "@/features/sales/actions";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";

import { useTranslation } from "@/components/providers/i18n-provider";

export function InstallmentsClient({ initialData }: { initialData: any[] }) {
    const { dict, dir } = useTranslation() as any;
    const { currency } = useSettings();
    const [installments, setInstallments] = useState(initialData);
    const [search, setSearch] = useState("");
    const [invoiceItemsData, setInvoiceItemsData] = useState<Record<number, any[]>>({});
    const [loadingInvoiceId, setLoadingInvoiceId] = useState<number | null>(null);

    const fetchItems = async (invoiceId: number) => {
        if (invoiceItemsData[invoiceId]) return;
        setLoadingInvoiceId(invoiceId);
        const res = await getInvoiceItems(invoiceId);
        if (res.success) {
            setInvoiceItemsData(prev => ({ ...prev, [invoiceId]: res.data }));
        }
        setLoadingInvoiceId(null);
    };

    const handlePay = async (id: number) => {
        const confirm = window.confirm(dict.Common.Confirm);
        if (!confirm) return;

        const res = await payInstallment(id, new Date().toISOString().split('T')[0]);
        if (res.success) {
            toast.success(dict.Advances.Success);
            setInstallments(prev => prev.map(inst =>
                inst.id === id ? { ...inst, status: 'paid', amountPaid: inst.amount, paidDate: new Date().toISOString().split('T')[0] } : inst
            ));
        } else {
            toast.error(res.message);
        }
    };

    // Logic to calculate sequence numbers per invoice
    const installmentsWithSequence = [...installments].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    const invoiceGroups: Record<number, number> = {};
    const processedData = installmentsWithSequence.map(inst => {
        invoiceGroups[inst.invoiceId] = (invoiceGroups[inst.invoiceId] || 0) + 1;
        return { ...inst, sequence: invoiceGroups[inst.invoiceId] };
    });

    const filtered = processedData.filter(inst =>
        inst.customerName.toLowerCase().includes(search.toLowerCase()) ||
        inst.invoiceNumber.toLowerCase().includes(search.toLowerCase())
    );

    // Filtered result stats
    const totalPendingAmount = filtered.filter(i => i.status !== 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
    const totalPaidAmount = filtered.filter(i => i.status === 'paid').reduce((sum, i) => sum + Number(i.amount), 0);
    const paidCount = filtered.filter(i => i.status === 'paid').length;

    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const dueThisMonth = filtered.filter(inst => {
        const due = new Date(inst.dueDate);
        return due.getMonth() === currentMonth && due.getFullYear() === currentYear && inst.status !== 'paid';
    });

    const totalDueThisMonth = dueThisMonth.reduce((sum, inst) => sum + Number(inst.amount), 0);
    const collectionRate = filtered.length > 0 ? Math.round((paidCount / filtered.length) * 100) : 0;

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-blue-600 flex items-center gap-2">
                            <Clock size={16} />
                            {dict.Dashboard.Due}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <div className="text-3xl font-black text-blue-900">{dueThisMonth.length}</div>
                            <span className="text-xs text-blue-500 font-bold">{dict.Advances.Month}</span>
                        </div>
                        <div className="text-sm font-bold text-blue-600/70 mt-1">
                            {formatCurrency(totalDueThisMonth, currency)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50 border-orange-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-orange-600 flex items-center gap-2">
                            <Wallet size={16} />
                            {dict.Dashboard.UpcomingInstallmentsTotal}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-black text-orange-900">{formatCurrency(totalPendingAmount, currency)}</div>
                        <p className="text-xs text-orange-500 mt-1 font-bold">{(dict as any).Installments?.Status?.PendingDesc }</p>
                    </CardContent>
                </Card>

                <Card className="bg-emerald-50 border-emerald-100 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-bold text-emerald-600 flex items-center gap-2">
                            <CheckCircle2 size={16} />
                            {dict.Common.StatusUpdated.replace("{status}", "")}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-black text-emerald-900">{collectionRate}%</div>
                            <div className="h-2 w-24 bg-emerald-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-emerald-600 transition-all duration-500 rounded-full"
                                    style={{ width: `${collectionRate}%` }}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-emerald-500 mt-1 font-bold">{(dict as any).Installments?.Status?.CommitmentDesc }</p>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="all" className="w-full">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4 bg-white p-2 rounded-xl border border-slate-100 shadow-sm">
                    <TabsList className="bg-slate-100/50">
                        <TabsTrigger value="all" className="font-bold">{dict.Common.All}</TabsTrigger>
                        <TabsTrigger value="due" className="font-bold text-red-600">{dict.Suppliers.Table.StatusLabels.Unpaid}</TabsTrigger>
                        <TabsTrigger value="paid" className="font-bold text-emerald-600">{dict.Suppliers.Table.StatusLabels.Paid}</TabsTrigger>
                    </TabsList>

                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <Input
                            placeholder={dict.Installments.SearchPlaceholder}
                            className="pl-10 border-slate-200 focus:border-blue-400 rounded-lg"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <TabsContent value="all" className="mt-0">
                    <InstallmentTable data={filtered} onPay={handlePay} fetchItems={fetchItems} itemsData={invoiceItemsData} loadingId={loadingInvoiceId} dict={dict} currency={currency} dir={dir} />
                </TabsContent>
                <TabsContent value="due" className="mt-0">
                    <InstallmentTable data={filtered.filter(i => i.status !== 'paid')} onPay={handlePay} fetchItems={fetchItems} itemsData={invoiceItemsData} loadingId={loadingInvoiceId} dict={dict} currency={currency} dir={dir} />
                </TabsContent>
                <TabsContent value="paid" className="mt-0">
                    <InstallmentTable data={filtered.filter(i => i.status === 'paid')} onPay={handlePay} fetchItems={fetchItems} itemsData={invoiceItemsData} loadingId={loadingInvoiceId} dict={dict} currency={currency} dir={dir} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function InstallmentTable({ data, onPay, fetchItems, itemsData, loadingId, dict, currency, dir }: {
    data: any[],
    onPay: (id: number) => void,
    fetchItems: (id: number) => void,
    itemsData: Record<number, any[]>,
    loadingId: number | null,
    dict: any,
    currency: string,
    dir: string
}) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [showInvoiceItems, setShowInvoiceItems] = useState<Record<number, boolean>>({});

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    // Grouping by invoiceId
    const groups: Record<string, any> = {};
    data.forEach(inst => {
        const key = `${inst.customerId}-${inst.invoiceId}`;
        if (!groups[key]) {
            groups[key] = {
                key,
                customerName: inst.customerName,
                invoiceNumber: inst.invoiceNumber,
                installments: [],
                totalAmount: 0,
                status: 'paid',
                installmentCount: inst.installmentCount,
                installmentInterest: inst.installmentInterest
            };
        }
        groups[key].installments.push(inst);
        groups[key].totalAmount += Number(inst.amount);
        if (inst.status !== 'paid') groups[key].status = 'pending';
    });

    const groupList = Object.values(groups);

    return (
        <Card className="border-none shadow-sm overflow-hidden bg-white">
            <Table>
                <TableHeader className="bg-slate-50/50">
                    <TableRow>
                        <TableHead className="text-start font-black w-[40px]"></TableHead>
                        <TableHead className="text-start font-black">{dict.Installments?.Table?.Customer} / {dict.Installments?.Table?.Invoice}</TableHead>
                        <TableHead className="text-center font-black">{dict.Installments?.Table?.DueDate}</TableHead>
                        <TableHead className="text-center font-black">{dict.Installments?.Table?.Amount}</TableHead>
                        <TableHead className="text-center font-black">{dict.Installments?.Table?.Status}</TableHead>
                        <TableHead className="text-center font-black">{dict.Installments?.Table?.Actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="text-center py-10 text-gray-400 font-bold">{dict.Installments.NoInstallments}</TableCell>
                        </TableRow>
                    ) : (
                        groupList.map((group: any) => (
                            <React.Fragment key={group.key}>
                                {/* Group Summary Row */}
                                <TableRow
                                    className="cursor-pointer hover:bg-slate-50 transition-colors border-b"
                                    onClick={() => toggleGroup(group.key)}
                                >
                                    <TableCell className="text-center">
                                        <div className={`transition-transform duration-200 ${expandedGroups[group.key] ? 'rotate-90' : ''}`}>
                                            {dir === 'rtl' ? '◀' : '▶'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-black text-slate-900 text-sm">{group.customerName}</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const invId = group.installments[0].invoiceId;
                                                    setShowInvoiceItems(prev => ({ ...prev, [invId]: !prev[invId] }));
                                                    if (!showInvoiceItems[invId]) fetchItems(invId);
                                                }}
                                                className="text-[10px] text-blue-600 font-mono font-bold hover:underline bg-blue-50 px-2 py-0.5 rounded w-fit"
                                            >
                                                {dict.Sidebar?.Invoice || dict.Invoices?.Title} #{group.invoiceNumber}
                                                {loadingId === group.installments[0].invoiceId ? "..." : ""}
                                            </button>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-slate-500 font-bold">
                                        {group.installments.length} {dict.Installments?.InstallmentsCount}
                                    </TableCell>
                                    <TableCell className="text-center font-black text-slate-900">
                                        {formatCurrency(group.totalAmount, currency)}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {group.status === 'paid' ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-none font-black text-[10px]">
                                                {dict.Installments?.Table?.Paid}
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-orange-500 border-orange-100 bg-orange-50 font-black text-[10px]">
                                                {dict.Installments?.Table?.Pending}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Button variant="ghost" size="sm" className="text-[10px] font-bold h-7">
                                            {expandedGroups[group.key] ? (dict.Common?.Hide) : (dict.Common?.Show)}
                                        </Button>
                                    </TableCell>
                                </TableRow>

                                {/* Full Invoice Details & Context */}
                                {showInvoiceItems[group.installments[0].invoiceId] && (
                                    <TableRow className="bg-blue-50/20">
                                        <TableCell colSpan={6} className="p-0 border-none">
                                            <div className="p-4 border-x border-b border-blue-100 mx-4 bg-white rounded-b-xl shadow-inner mb-2">
                                                {/* Plan Summary Enhancement */}
                                                <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100 mb-4 flex justify-around items-center text-[10px] relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 p-1 opacity-10">
                                                        <Wallet size={40} className="rotate-12" />
                                                    </div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-orange-600 font-bold">{dict.Sales?.Invoice?.Form?.InstallmentMonths}</span>
                                                        <span className="text-sm font-black text-orange-900">{group.installmentCount}</span>
                                                    </div>
                                                    <div className="h-8 w-px bg-orange-200/50"></div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-orange-600 font-bold">{dict.Sales?.Invoice?.Form?.InstallmentInterest}</span>
                                                        <span className="text-sm font-black text-orange-900">{group.installmentInterest}%</span>
                                                    </div>
                                                    <div className="h-8 w-px bg-orange-200/50"></div>
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-orange-600 font-bold">{dict.Sales?.Invoice?.Form?.ExpectedMonthlyInstallment}</span>
                                                        <span className="text-sm font-black text-orange-900">{formatCurrency(group.installments[0].amount, currency)}</span>
                                                    </div>
                                                </div>

                                                <div className="text-[10px] font-black text-blue-700 mb-2 uppercase tracking-wider flex items-center gap-2">
                                                    <Search size={12} /> {dict.Sales?.Invoice?.Table?.Item || dict.Sales?.Table?.Item}
                                                </div>

                                                {itemsData[group.installments[0].invoiceId] ? (
                                                    <div className="border rounded-lg overflow-hidden">
                                                        <div className="grid grid-cols-4 gap-2 text-[10px] font-black text-slate-400 bg-slate-50 p-2 border-b">
                                                            <div className="col-span-2">{dict.Sales?.Table?.Item}</div>
                                                            <div className="text-center">{dict.Sales?.Table?.Qty}</div>
                                                            <div className="text-end">{dict.Sales?.Table?.Price}</div>
                                                        </div>
                                                        {itemsData[group.installments[0].invoiceId].map((item: any, iIdx: number) => (
                                                            <div key={iIdx} className="grid grid-cols-4 gap-2 text-xs py-2 px-2 border-b border-slate-50 last:border-0 hover:bg-slate-50/80 transition-colors">
                                                                <div className="col-span-2 font-bold text-slate-700">{item.description}</div>
                                                                <div className="text-center font-mono text-slate-500 font-bold">{item.quantity}</div>
                                                                <div className="text-end font-black text-slate-900">{formatCurrency(item.unitPrice, currency)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="py-4 text-center text-xs text-muted-foreground animate-pulse">Loading items...</div>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {/* Expanded Installments */}
                                {expandedGroups[group.key] && group.installments.map((inst: any) => (
                                    <TableRow key={inst.id} className="bg-white/50 hover:bg-slate-50 transition-colors border-b last:border-b-2">
                                        <TableCell></TableCell>
                                        <TableCell className="text-start">
                                            <div className="flex items-center gap-3 px-4">
                                                <div className="h-1.5 w-1.5 rounded-full bg-blue-400"></div>
                                                <span className="text-xs font-bold text-slate-600">
                                                    {dict.Installments?.Table?.InstallmentNum} {inst.sequence}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-slate-500 font-mono text-xs">
                                            {inst.dueDate}
                                        </TableCell>
                                        <TableCell className="text-center font-black text-slate-700 text-sm">
                                            {formatCurrency(inst.amount, currency)}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {inst.status === 'paid' ? (
                                                <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] px-2 h-5">
                                                    {dict.Installments?.Table?.Paid}
                                                </Badge>
                                            ) : new Date(inst.dueDate) < new Date() ? (
                                                <Badge variant="destructive" className="flex items-center gap-1 mx-auto w-fit font-black text-[9px] px-2 h-5">
                                                    <AlertCircle size={8} />
                                                    {dict.Installments?.Table?.Overdue}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-blue-500 border-blue-50 bg-white font-black text-[9px] px-2 h-5">
                                                    {dict.Installments?.Table?.Upcoming}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                {inst.status !== 'paid' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={(e) => { e.stopPropagation(); onPay(inst.id); }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 h-6 px-3 font-black text-[9px] rounded-full"
                                                    >
                                                        {dict.Installments?.Table?.PayAction}
                                                    </Button>
                                                )}
                                                {inst.status === 'paid' && (
                                                    <span className="text-[9px] text-emerald-600 font-black font-mono">
                                                        {inst.paidDate}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </React.Fragment>
                        ))
                    )}
                </TableBody>
            </Table>
        </Card>
    );
}
