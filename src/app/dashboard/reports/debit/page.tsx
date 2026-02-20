"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Calendar, User, AlertTriangle, ArrowLeft } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getSupplierDebitReport } from "@/features/reports/actions";
import { toast } from "sonner";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

export default function SupplierDebitReportPage() {
    const { dict } = useTranslation() as any;
    const { currency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getSupplierDebitReport();
            if (res.success) {
                setData(res.data || []);
            } else {
                throw new Error(res.message);
            }
        } catch (e: any) {
            console.error(e);
            toast.error(dict.Common?.Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const totalRemaining = data.reduce((acc, item) => acc + (Number(item.remaining) || 0), 0);
    const t = dict.Reports?.SupplierDebitReport || {};

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6" dir="rtl">
            <ReportsBackButton />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Calendar className="w-8 h-8 text-rose-600" />
                        {t.Title }
                    </h1>
                    <p className="text-slate-500 mt-1 font-bold">
                        {t.Desc }
                    </p>
                </div>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-rose-50 to-orange-50 border-rose-200 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-rose-800 text-lg flex items-center gap-2 font-black">
                            <Loader2 className={loading ? "w-5 h-5 animate-spin" : "w-5 h-5"} />
                            {t.TotalRemaining }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                            {formatCurrency(totalRemaining, currency)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-700 text-lg flex items-center gap-2 font-black">
                            <User className="w-5 h-5" />
                            {t.InvoicesCount }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900">
                            {data.length} <span className="text-lg font-bold text-gray-500">{dict.Common?.Invoice}</span>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="font-black text-slate-800">
                        {t.TableTitle }
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 flex justify-center">
                            <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
                        </div>
                    ) : data.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-black text-slate-600">
                                {t.NoData }
                            </h3>
                            <p className="font-bold text-sm">{t.NoDataHint }</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-start font-black">{dict.Invoices?.Table?.InvoiceNo}</TableHead>
                                        <TableHead className="text-start font-black">{dict.Invoices?.Table?.Supplier}</TableHead>
                                        <TableHead className="text-center font-black">{dict.Invoices?.Table?.Date}</TableHead>
                                        <TableHead className="text-center font-black">{dict.Invoices?.Table?.DueDate}</TableHead>
                                        <TableHead className="text-end font-black">{dict.Invoices?.Table?.Total}</TableHead>
                                        <TableHead className="text-end font-black">{dict.Invoices?.Table?.Balance}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item, idx) => (
                                        <TableRow key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-900">
                                                {item.invoiceNumber === "رصيد سابق / افتتاحية" || item.invoiceNumber === "Opening Balance / Previous" ? (
                                                    <span className="text-amber-600">{t.OpeningBalanceLabel }</span>
                                                ) : (
                                                    `#${item.invoiceNumber}`
                                                )}
                                            </TableCell>
                                            <TableCell className="font-bold text-slate-700">{item.supplierName}</TableCell>
                                            <TableCell className="text-center font-mono text-gray-500">
                                                {(() => {
                                                    if (!item.issueDate) return '---';
                                                    const d = new Date(item.issueDate);
                                                    return isNaN(d.getTime()) ? '---' : d.toLocaleDateString();
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {(() => {
                                                    if (!item.dueDate) return <span className="text-gray-300">---</span>;
                                                    const d = new Date(item.dueDate);
                                                    if (isNaN(d.getTime())) return <span className="text-gray-300">---</span>;
                                                    const isOverdue = d < new Date();
                                                    return (
                                                        <span className={cn(
                                                            "px-3 py-1 rounded-full font-bold text-xs whitespace-nowrap",
                                                            isOverdue ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                                                        )}>
                                                            {d.toLocaleDateString()}
                                                        </span>
                                                    );
                                                })()}
                                            </TableCell>
                                            <TableCell className="text-end font-bold text-slate-600">
                                                {formatCurrency(item.totalAmount, currency)}
                                            </TableCell>
                                            <TableCell className="text-end font-black text-rose-700">
                                                {formatCurrency(item.remaining, currency)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
