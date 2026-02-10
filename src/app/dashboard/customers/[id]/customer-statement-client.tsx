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

function SafeFormatDate(dateStr: any, formatStr: string) {
    try {
        const d = new Date(dateStr);
        if (!isValid(d)) return "Invalid Date";
        return format(d, formatStr);
    } catch (e) {
        return "Error Date";
    }
}

export default function CustomerStatementClient({ data, dict, currency }: any) {
    const { customer, transactions, summary } = data;
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `${dict.Customers.Statement.Title} - ${customer?.name || dict.Common.NA}`,
    });

    return (
        <div className="space-y-6">
            {/* Header & Actions */}
            <div className="flex items-center justify-between no-print mb-4">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/customers">
                        <Button variant="outline" size="icon" type="button">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">{dict.Customers.Statement.Title}</h1>
                        <p className="text-muted-foreground">{customer?.name}</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    className="gap-2"
                    type="button"
                    onClick={() => handlePrint()}
                >
                    <Printer className="h-4 w-4" />
                    {dict.Customers.Statement.Print}
                </Button>
            </div>

            {/* Content to Print */}
            <div ref={printRef} className="space-y-6 p-4 print:p-0 bg-white rounded-xl">
                {/* Print Header */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Customers.Statement.Title}</h1>
                        <h2 className="text-2xl font-black text-blue-700">{customer?.name}</h2>
                        <p className="text-slate-500 text-sm">{dict.Common.ReportDate}: {new Date().toLocaleDateString('ar-EG')}</p>
                    </div>
                    <div className="text-left" dir="ltr">
                        <h2 className="text-xl font-bold">{dict.Logo}</h2>
                        <p className="text-xs text-muted-foreground">{dict.Customers.Statement.Title}</p>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card className="print:shadow-none print:border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Customers?.Statement?.Summary?.TotalDebit}</CardTitle>
                            <TrendingUp className="h-4 w-4 text-blue-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalDebit, currency)}</div>
                            <p className="text-xs text-muted-foreground">{dict.Customers?.Statement?.Summary?.TotalDebitDesc}</p>
                        </CardContent>
                    </Card>
                    <Card className="print:shadow-none print:border">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Customers?.Statement?.Summary?.TotalCredit}</CardTitle>
                            <TrendingDown className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCredit, currency)}</div>
                            <p className="text-xs text-muted-foreground">{dict.Customers?.Statement?.Summary?.TotalCreditDesc}</p>
                        </CardContent>
                    </Card>
                    <Card className={`${summary.netBalance > 0 ? "border-blue-200 bg-blue-50" : "border-green-200 bg-green-50"} print:shadow-none print:border`}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">{dict.Customers?.Statement?.Summary?.NetBalance}</CardTitle>
                            <Wallet className="h-4 w-4 text-primary" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">
                                {formatCurrency(Math.abs(summary.netBalance), currency)}
                                <span className="text-sm font-normal text-muted-foreground mx-1">
                                    {summary.netBalance > 0 ? dict.Customers?.Statement?.Summary?.DebitLabel : dict.Customers?.Statement?.Summary?.CreditLabel}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {summary.netBalance > 0 ? dict.Customers?.Statement?.Summary?.CollectFrom : dict.Customers?.Statement?.Summary?.BalanceDue}
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Transactions Table */}
                <Card className="print:shadow-none print:border mt-6">
                    <CardHeader className="print:p-2">
                        <CardTitle>{dict.Customers.Statement.Table.Transactions}</CardTitle>
                    </CardHeader>
                    <CardContent className="print:p-1">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[120px]">{dict.Customers.Statement.Table.Date}</TableHead>
                                    <TableHead>{dict.Sales.Invoice.Form.DueDate}</TableHead>
                                    <TableHead>{dict.Customers.Statement.Table.Type}</TableHead>
                                    <TableHead>{dict.Customers.Statement.Table.Ref}</TableHead>
                                    <TableHead>{dict.Customers.Statement.Table.Description}</TableHead>
                                    <TableHead className="text-start text-blue-600 font-bold">{dict.Customers.Statement.Table.Debit}</TableHead>
                                    <TableHead className="text-start text-green-600 font-bold">{dict.Customers.Statement.Table.Credit}</TableHead>
                                    <TableHead className="text-start font-bold">{dict.Customers.Statement.Table.Balance}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {/* Opening Balance */}
                                {customer?.openingBalance !== 0 && (
                                    <TableRow className="bg-muted/50 border-slate-200">
                                        <TableCell>-</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{dict.Customers.Statement.Table.OpeningBalance}</TableCell>
                                        <TableCell>-</TableCell>
                                        <TableCell>{dict.Customers.Statement.Table.OpeningBalanceDesc}</TableCell>
                                        <TableCell className="text-start font-mono tabular-nums">
                                            {Number(customer?.openingBalance) > 0 ? formatCurrency(Number(customer?.openingBalance), currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono tabular-nums">
                                            {Number(customer?.openingBalance) < 0 ? formatCurrency(Math.abs(Number(customer?.openingBalance)), currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono font-bold tabular-nums">{formatCurrency(Number(customer?.openingBalance), currency)}</TableCell>
                                    </TableRow>
                                )}

                                {transactions.map((t: any) => (
                                    <TableRow key={t.id} className="border-slate-100">
                                        <TableCell className="text-start">
                                            <div className="flex flex-col">
                                                <span>{SafeFormatDate(t.date, "dd/MM/yyyy")}</span>
                                                <span className="text-xs text-muted-foreground">{SafeFormatDate(t.date, "hh:mm a")}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-bold text-amber-600 text-start">
                                            {t.dueDate ? SafeFormatDate(t.dueDate, "dd/MM/yyyy") : "-"}
                                        </TableCell>
                                        <TableCell className="text-start">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${t.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                                                }`}>
                                                {t.type === 'INVOICE' ? dict.Customers.Statement.Table.Invoice : dict.Customers.Statement.Table.Payment}
                                            </span>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-start">{t.reference || t.ref || "-"}</TableCell>
                                        <TableCell className="max-w-[300px] truncate text-start" title={t.description}>{t.description}</TableCell>
                                        <TableCell className="text-start font-mono text-blue-600 tabular-nums">
                                            {t.debit > 0 ? formatCurrency(t.debit, currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono text-green-600 tabular-nums">
                                            {t.credit > 0 ? formatCurrency(t.credit, currency) : "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono font-bold tabular-nums">
                                            {formatCurrency(t.balance, currency)}
                                        </TableCell>
                                    </TableRow>
                                ))}

                                {transactions.length === 0 && customer?.openingBalance === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {dict.Customers.Statement.Table.NoData}
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
                        <p className="font-bold underline mb-10">{dict.PrintSettings?.ReviewSignature || "توقيع المراجعة"}</p>
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
