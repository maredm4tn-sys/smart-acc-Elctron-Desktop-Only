"use client";

import React, { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { ArrowLeft, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { format, isValid } from "date-fns";

function SafeFormatDate(dateStr: string, formatStr: string) {
    try {
        const d = new Date(dateStr);
        if (!isValid(d)) return "Invalid Date";
        return format(d, formatStr);
    } catch (e) {
        return "Error Date";
    }
}

export default function SupplierStatementClient({ data, dict, currency }: any) {
    const { supplier, transactions, summary } = data;
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `${dict.Suppliers.Statement.Title} - ${supplier?.name || "N/A"}`,
    });

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex items-center justify-between no-print mb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/suppliers">
                        <Button variant="outline" size="icon" type="button">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{dict.Suppliers?.Statement?.Title || "كشف حساب مورد"}</h1>
                        <p className="text-muted-foreground">{supplier?.name}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    type="button"
                    onClick={() => handlePrint()}
                >
                    <Printer className="h-4 w-4" />
                    {dict.Suppliers?.Statement?.Print || "طباعة كشف الحساب"}
                </Button>
            </div>

            {/* Content to Print */}
            <div ref={printRef} className="space-y-6 p-4 print:p-0 bg-white rounded-xl">
                {/* Print Header (Visible only when printing) */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Suppliers.Statement.Title}</h1>
                        <h2 className="text-2xl font-black text-blue-700">{supplier.name}</h2>
                        <p className="text-slate-500 text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="text-left">
                        <h2 className="text-xl font-bold">Smart Accountant</h2>
                        <p className="text-xs text-muted-foreground">كشف حساب مورد مالي</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="print:shadow-none print:border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Suppliers.Statement.Summary.TotalCredit}</CardTitle>
                            <TrendingUp className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCredit, currency)}</div>
                            <p className="text-xs text-muted-foreground">{dict.Suppliers.Statement.Summary.TotalCreditDesc}</p>
                        </CardContent>
                    </Card>
                    <Card className="print:shadow-none print:border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Suppliers.Statement.Summary.TotalDebit}</CardTitle>
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalDebit, currency)}</div>
                            <p className="text-xs text-muted-foreground">{dict.Suppliers.Statement.Summary.TotalDebitDesc}</p>
                        </CardContent>
                    </Card>
                    <Card className={`${summary.netBalance > 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"} print:shadow-none print:border`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Suppliers.Statement.Summary.NetBalance}</CardTitle>
                            <Wallet className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(Math.abs(summary.netBalance), currency)}
                                <span className="text-sm font-normal text-muted-foreground mx-1">
                                    {summary.netBalance > 0 ? dict.Suppliers.Statement.Summary.CreditLabel : dict.Suppliers.Statement.Summary.DebitLabel}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {summary.netBalance > 0 ? dict.Suppliers.Statement.Summary.NetBalanceCredit : dict.Suppliers.Statement.Summary.NetBalanceDebit}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions Table */}
                <Card className="print:shadow-none print:border mt-6">
                    <CardHeader className="print:p-2">
                        <CardTitle>{dict.Suppliers.Statement.Table.Transactions}</CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px] text-start">{dict.Suppliers.Statement.Table.Date}</TableHead>
                                    <TableHead className="text-start">{dict.Suppliers.Statement.Table.Type}</TableHead>
                                    <TableHead className="text-start">{dict.Suppliers.Statement.Table.Ref}</TableHead>
                                    <TableHead className="text-start">{dict.Suppliers.Statement.Table.Description}</TableHead>
                                    <TableHead className="text-start text-red-600 font-bold">{dict.Suppliers.Statement.Table.Credit}</TableHead>
                                    <TableHead className="text-start text-green-600 font-bold">{dict.Suppliers.Statement.Table.Debit}</TableHead>
                                    <TableHead className="text-start font-bold">{dict.Suppliers.Statement.Table.Balance}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Opening Balance Row */}
                                {supplier.openingBalance !== 0 && (
                                    <TableRow className="bg-muted/50">
                                        <TableCell>-</TableCell>
                                        <TableCell>{dict.Suppliers.Statement.Table.OpeningBalance}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{dict.Suppliers.Statement.Table.OpeningBalanceDesc}</TableCell>
                                        <TableCell className="text-start font-mono tabular-nums">
                                            {Number(supplier.openingBalance) > 0 ? formatCurrency(Number(supplier.openingBalance), currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono tabular-nums">
                                            {Number(supplier.openingBalance) < 0 ? formatCurrency(Math.abs(Number(supplier.openingBalance)), currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono font-bold tabular-nums">{formatCurrency(Number(supplier.openingBalance), currency)}</TableCell>
                                    </TableRow>
                                )}

                                {transactions.map((t: any) => (
                                    <TableRow key={t.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span>{SafeFormatDate(t.date, "dd/MM/yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">{SafeFormatDate(t.date, "hh:mm a")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'INVOICE' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {t.type === 'INVOICE' ? dict.Suppliers.Statement.Table.Invoice : dict.Suppliers.Statement.Table.Payment}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{t.ref || t.reference}</TableCell>
                                        <TableCell className="max-w-[300px] truncate" title={t.description}>{t.description}</TableCell>
                                        <TableCell className="text-start font-mono text-red-600 tabular-nums">
                                            {t.credit > 0 ? formatCurrency(t.credit, currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono text-green-600 tabular-nums">
                                            {t.debit > 0 ? formatCurrency(t.debit, currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono font-bold tabular-nums">
                                            {formatCurrency(t.balance, currency)}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {transactions.length === 0 && supplier.openingBalance === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                            {dict.Suppliers.Statement.Table.NoData}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {/* Print Footer */}
                <div className="hidden print:flex justify-between items-end mt-20 pt-10 border-t">
                    <div className="text-center">
                        <p className="font-bold underline mb-10">{dict.PrintSettings?.AccountantSignature || "توقيع المحاسب"}</p>
                        <p className="text-slate-300">..............................</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold underline mb-10">{dict.PrintSettings?.ReviewerSignature || "توقيع المراجعة"}</p>
                        <p className="text-slate-300">..............................</p>
                    </div>
                    <div className="text-center">
                        <p className="font-bold underline mb-10">{dict.PrintSettings?.Stamp || "ختم المؤسسة"}</p>
                        <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
