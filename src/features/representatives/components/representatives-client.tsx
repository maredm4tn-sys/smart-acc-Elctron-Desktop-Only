"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { User, BadgePercent, ArrowRightLeft, Plus } from "lucide-react";
import { RepresentativeActions } from "./representative-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { exportToExcel } from "@/lib/export-excel";
import { AddRepresentativeDialog } from "./add-representative-dialog";
import { BulkImportRepresentativesDialog } from "./bulk-import-dialog";

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
        <div className="space-y-6 animate-in fade-in duration-500 pb-10">
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
                <div className="w-full">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">{dict.Representatives.Title}</h1>
                    <p className="text-slate-500 mt-1">{dict.Representatives.Description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-end">
                    <BulkImportRepresentativesDialog />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(representatives, 'Representatives', 'RepresentativesList')}
                        className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold gap-2 shadow-sm rounded-xl h-10 px-4"
                    >
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                        <span className="hidden sm:inline">{dict.Representatives.ExportExcel}</span>
                    </Button>

                    <AddRepresentativeDialog />
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden rounded-2xl" dir={dict.Common?.Direction}>
                <CardHeader className="pb-4 bg-slate-50/50 border-b">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                        <User className="h-5 w-5 text-blue-600" />
                        {dict.Representatives.MenuLabel || dict.Representatives.Title}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rounded-xl border overflow-x-auto bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-start font-black text-slate-900 pr-4">{dict.Representatives.Table?.Name}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900">{dict.Representatives.Table?.Type}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900">{dict.Representatives.Table?.Phone}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900 hidden md:table-cell">{dict.Representatives.Table?.Address}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900">{dict.Representatives.Table?.Commission}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900 hidden lg:table-cell">{dict.Representatives.Table?.Notes}</TableHead>
                                    <TableHead className="text-start font-black text-slate-900">{dict.Common?.Actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {!representatives || representatives.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center h-40 text-slate-400 font-bold">
                                            {dict.Common?.NoData}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    representatives.map((item) => (
                                        <TableRow key={item?.id || Math.random()} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-start font-bold text-slate-900 pr-4 whitespace-nowrap">
                                                {item?.name || "-"}
                                            </TableCell>
                                            <TableCell className="text-start">
                                                <Badge variant={item?.type === 'sales' ? 'default' : 'secondary'} className="rounded-full text-[10px] font-black px-3 shadow-none border-none">
                                                    {item?.type === 'sales'
                                                        ? (dict.Representatives?.Types?.Sales)
                                                        : (dict.Representatives?.Types?.Delivery)
                                                    }
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-start font-bold text-slate-500 font-mono text-xs">
                                                <span dir="ltr" className="inline-block">{item?.phone || "-"}</span>
                                            </TableCell>
                                            <TableCell className="text-start hidden md:table-cell">
                                                <div className="truncate max-w-[200px] text-xs text-slate-600 font-medium" title={item?.address || ""}>{item?.address || "-"}</div>
                                            </TableCell>
                                            <TableCell className="text-start">
                                                {Number(item?.commissionRate || 0) > 0 ? (
                                                    <div className="inline-flex items-center gap-1 font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs">
                                                        <BadgePercent size={14} />
                                                        {item.commissionRate}%
                                                    </div>
                                                ) : <span className="text-slate-300 font-bold">-</span>}
                                            </TableCell>
                                            <TableCell className="text-start hidden lg:table-cell">
                                                <div className="truncate max-w-[150px] text-xs text-slate-400 font-medium italic">{item?.notes || "-"}</div>
                                            </TableCell>
                                            <TableCell className="text-start">
                                                <div className="flex justify-start">
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
        </div>
    );
}
