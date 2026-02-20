"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Users, AlertCircle, Phone, ArrowLeft } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getCustomerCreditReport } from "@/features/reports/actions";
import { toast } from "sonner";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

export default function CustomerCreditReportPage() {
    const { dict } = useTranslation() as any;
    const { currency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any[]>([]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getCustomerCreditReport();
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

    const totalCredit = data.reduce((acc, item) => acc + (Number(item.creditAmount) || 0), 0);
    const t = dict.Reports?.CustomerCreditReport || {};

    return (
        <div className="space-y-6 animate-in fade-in duration-500 p-6" dir="rtl">
            <ReportsBackButton />
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <Users className="w-8 h-8 text-indigo-600" />
                        {t.Title }
                    </h1>
                    <p className="text-slate-500 mt-1 font-bold">
                        {t.Desc }
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200 shadow-sm relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-indigo-800 text-lg flex items-center gap-2 font-black">
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <AlertCircle className="w-5 h-5" />}
                            {t.TotalCredit }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900 tracking-tighter">
                            {formatCurrency(totalCredit, currency)}
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-700 text-lg flex items-center gap-2 font-black">
                            <Users className="w-5 h-5" />
                            {t.CustomersCount }
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-900">
                            {data.length} <span className="text-lg font-bold text-gray-500">{dict.Common?.Customer}</span>
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
                            <Users className="w-16 h-16 mb-4 opacity-10" />
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
                                        <TableHead className="text-start font-black">{dict.Customers?.Table?.Name}</TableHead>
                                        <TableHead className="text-center font-black">{dict.Customers?.Table?.Phone}</TableHead>
                                        <TableHead className="text-end font-black">{dict.Common?.Credit}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item, idx) => (
                                        <TableRow key={item.id || idx} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-black text-slate-900">{item.customerName}</TableCell>
                                            <TableCell className="text-center">
                                                <div className="flex items-center justify-center gap-2 text-slate-500 font-bold">
                                                    <Phone size={14} />
                                                    {item.phone || "---"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-end font-black text-emerald-700">
                                                {formatCurrency(item.creditAmount, currency)}
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
