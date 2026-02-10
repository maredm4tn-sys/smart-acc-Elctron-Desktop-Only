"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, AlertTriangle, TrendingDown, DollarSign, PackageOpen } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getStagnantProducts } from "@/features/reports/actions";
import { toast } from "sonner";

export default function StagnantStockReportPage() {
    const { dict } = useTranslation() as any;
    const { currency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState("30"); // days
    const [data, setData] = useState<any[]>([]);
    const [totalValue, setTotalValue] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getStagnantProducts(Number(period));
            if (res.success) {
                setData(res.data?.data || []);
                setTotalValue(res.data?.totalValue || 0);
            } else {
                throw new Error(res.message);
            }
        } catch (e: any) {
            console.error(e);
            toast.error(dict.Common?.Error || "Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [period]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir="rtl">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-right">
                    <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
                        <TrendingDown className="w-8 h-8 text-amber-600" />
                        {dict.Reports?.StagnantStock?.Title || "تحليل الركود السلعي"}
                    </h1>
                    <p className="text-slate-500 mt-1 font-bold">
                        {dict.Reports?.StagnantStock?.Desc || "تحديد المنتجات التي لم تُبع لفترة طويلة لتحرير رأس المال المجمد."}
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl border shadow-sm">
                    <span className="text-sm font-bold text-gray-500 px-2">{dict.Reports?.StagnantStock?.Period || "فترة الركود"}:</span>
                    <Select value={period} onValueChange={setPeriod}>
                        <SelectTrigger className="w-[180px] h-10 font-bold border-none shadow-none bg-slate-50">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="30">{dict.Reports?.StagnantStock?.Days30 || "30 يوم (تنبيه)"}</SelectItem>
                            <SelectItem value="60">{dict.Reports?.StagnantStock?.Days60 || "60 يوم (بطيء)"}</SelectItem>
                            <SelectItem value="90">{dict.Reports?.StagnantStock?.Days90 || "90 يوم (راكد)"}</SelectItem>
                            <SelectItem value="180">{dict.Reports?.StagnantStock?.Days180 || "180 يوم (مخزون ميت)"}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 shadow-sm relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-200/20 rounded-full blur-2xl"></div>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-amber-800 text-lg flex items-center gap-2 font-black">
                            <DollarSign className="w-5 h-5" /> {dict.Reports?.StagnantStock?.TotalValue || "رأس المال المجمد"}
                        </CardTitle>
                        <CardDescription className="text-amber-600 font-bold">
                            {dict.Reports?.StagnantStock?.TotalValueDesc || "إجمالي قيمة التكلفة للأصناف الراكدة"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-amber-600" /> : (
                            <div className="text-4xl font-black text-slate-900 tracking-tighter">
                                {formatCurrency(totalValue, currency)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-700 text-lg flex items-center gap-2 font-black">
                            <PackageOpen className="w-5 h-5" /> {dict.Reports?.StagnantStock?.ItemsCount || "عدد الأصناف الراكدة"}
                        </CardTitle>
                        <CardDescription className="font-bold">
                            {dict.Reports?.StagnantStock?.ItemsCountDesc || "عدد المنتجات الفريدة التي لا توجد عليها حركة"}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? <Loader2 className="w-6 h-6 animate-spin text-slate-600" /> : (
                            <div className="text-4xl font-black text-slate-900">
                                {data.length} <span className="text-lg font-bold text-gray-500">{dict.Common?.Item || "صنف"}</span>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Table */}
            <Card className="border shadow-lg overflow-hidden rounded-2xl">
                <CardHeader className="bg-slate-50 border-b">
                    <CardTitle className="font-black text-slate-800">{dict.Reports?.StagnantStock?.TableTitle || "تفاصيل الأصناف الراكدة"}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-slate-300" /></div>
                    ) : data.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                            <AlertTriangle className="w-16 h-16 mb-4 opacity-20" />
                            <h3 className="text-lg font-black text-slate-600">{dict.Reports?.StagnantStock?.NoData || "ممتاز! لا يوجد ركود سلعي."}</h3>
                            <p className="font-bold">{dict.Reports?.StagnantStock?.NoDataDesc || "المخزون يتحرك بشكل جيد خلال هذه الفترة."}</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-start font-black">{dict.Inventory?.Table?.Name || "اسم المنتج"}</TableHead>
                                        <TableHead className="text-start font-black">{dict.Inventory?.Table?.SKU || "الكود"}</TableHead>
                                        <TableHead className="text-center font-black">{dict.Inventory?.Table?.Stock || "الكمية"}</TableHead>
                                        <TableHead className="text-end font-black">{dict.Inventory?.Table?.BuyPrice || "سعر التكلفة"}</TableHead>
                                        <TableHead className="text-end font-black">{dict.Reports?.StagnantStock?.TotalCost || "القيمة المجمدة"}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.map((item) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-slate-900">{item.name}</TableCell>
                                            <TableCell className="font-mono text-gray-500">{item.sku}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full font-black text-sm">
                                                    {item.stock}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-end font-bold text-slate-600">{formatCurrency(item.buyPrice, currency)}</TableCell>
                                            <TableCell className="text-end font-black text-amber-700">
                                                {formatCurrency(item.stockValue, currency)}
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
