"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, BadgePercent } from "lucide-react";
import { RepresentativeActions } from "./representative-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function RepresentativesClient({ representatives = [], dict }: { representatives?: any[], dict: any }) {
    // Safety check for dictionary
    if (!dict?.Representatives) {
        return (
            <Card className="border-none shadow-md overflow-hidden">
                <CardContent className="p-10 text-center text-gray-500">
                    جاري تحميل البيانات...
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-md overflow-hidden" dir={dict.Common?.Direction || 'rtl'}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    {dict.Representatives?.MenuLabel || "المندوبين"}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
                <div className="rounded-md border overflow-x-auto" dir="rtl">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="text-right font-black text-slate-900 pr-4">{dict.Representatives?.Table?.Name || "الاسم"}</TableHead>
                                <TableHead className="text-right font-black text-slate-900">{dict.Representatives?.Table?.Type || "النوع"}</TableHead>
                                <TableHead className="text-right font-black text-slate-900">{dict.Representatives?.Table?.Phone || "الهاتف"}</TableHead>
                                <TableHead className="text-right font-black text-slate-900">{dict.Representatives?.Table?.Address || "العنوان"}</TableHead>
                                <TableHead className="text-right font-black text-slate-900">{dict.Representatives?.Table?.Commission || "العمولة"}</TableHead>
                                <TableHead className="text-right font-black text-slate-900">{dict.Representatives?.Table?.Notes || "ملاحظات"}</TableHead>
                                <TableHead className="text-left font-black text-slate-900 pl-4 w-[120px]">{dict.Representatives?.Table?.Actions || "إجراءات"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!representatives || representatives.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center h-24 text-gray-500 font-bold italic">
                                        {dict.Common?.NoData || "لا يوجد بيانات."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                representatives.map((item) => (
                                    <TableRow key={item?.id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="text-right font-bold text-slate-900 pr-4">
                                            {item?.name || "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant={item?.type === 'sales' ? 'default' : 'secondary'} className="rounded-full text-[10px] font-black px-3">
                                                {item?.type === 'sales'
                                                    ? (dict.Representatives?.Types?.Sales || "مندوب مبيعات")
                                                    : (dict.Representatives?.Types?.Delivery || "مندوب توصيل")
                                                }
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-slate-500 text-xs tabular-nums" dir="ltr">{item?.phone || "-"}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="truncate max-w-[200px] text-xs text-slate-600 font-medium" title={item?.address || ""}>{item?.address || "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {Number(item?.commissionRate || 0) > 0 ? (
                                                <div className="inline-flex items-center gap-1 font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                                                    <BadgePercent size={14} />
                                                    {item.commissionRate}%
                                                </div>
                                            ) : <span className="text-slate-300 font-bold">-</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="truncate max-w-[150px] text-xs text-slate-400 font-medium italic">{item?.notes || "-"}</div>
                                        </TableCell>
                                        <TableCell className="text-left pl-2">
                                            <div className="flex justify-end">
                                                <RepresentativeActions representative={item} dict={dict} />
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

