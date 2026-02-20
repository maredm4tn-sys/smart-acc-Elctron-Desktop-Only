
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, FileText, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function PurchaseDetailsClient({ invoice, dict, currency }: { invoice: any, dict: any, currency: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/purchases">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {dict.Purchases?.Title} #{invoice.invoiceNumber}
                        </h1>
                        <p className="text-muted-foreground">{dict.Purchases?.Description}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {/* Optional: Print button if needed later */}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User size={14} /> {dict.Purchases?.Form?.Supplier}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{invoice.supplierName}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar size={14} /> {dict.Purchases?.Form?.Date}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{invoice.issueDate}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText size={14} /> {dict.Purchases?.Table?.Status}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={invoice.paymentStatus === 'paid' ? 'secondary' : 'outline'}>
                            {invoice.paymentStatus === 'paid' ? dict.Purchases?.Table?.StatusLabels?.Paid :
                                invoice.paymentStatus === 'unpaid' ? dict.Purchases?.Table?.StatusLabels?.Unpaid :
                                    invoice.paymentStatus === 'partial' ? dict.Purchases?.Table?.StatusLabels?.Partial :
                                        invoice.paymentStatus?.toUpperCase()}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{dict.Purchases?.Form?.Items}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{dict.Purchases?.Form?.Product}</TableHead>
                                <TableHead className="text-center">{dict.Purchases?.Form?.Quantity}</TableHead>
                                <TableHead className="text-end">{dict.Purchases?.Form?.Cost}</TableHead>
                                <TableHead className="text-end">{dict.Purchases?.Form?.Total}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-end dir-ltr">{formatCurrency(item.unitCost, currency)}</TableCell>
                                    <TableCell className="text-end font-bold dir-ltr">{formatCurrency(item.total, currency)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-8 flex justify-end">
                        <div className="w-full md:w-1/3 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center text-sm font-medium text-slate-500">
                                <span>{dict.Purchases?.Form?.Total}</span>
                                <span className="font-black text-xl text-slate-900 dir-ltr">{formatCurrency(invoice.totalAmount, currency)}</span>
                            </div>

                            {Number(invoice.amountPaid) > 0 && (
                                <>
                                    <div className="flex justify-between items-center text-sm font-medium text-green-600 pt-2 border-t border-slate-200">
                                        <span>{dict.Purchases?.Table?.StatusLabels?.Paid}</span>
                                        <span className="font-bold dir-ltr">{formatCurrency(invoice.amountPaid, currency)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm font-black text-red-600 pt-2 border-t border-dashed border-red-200">
                                        <span>{dict.Sales?.Table?.Remaining}</span>
                                        <span className="text-lg dir-ltr">{formatCurrency(Number(invoice.totalAmount) - Number(invoice.amountPaid), currency)}</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
