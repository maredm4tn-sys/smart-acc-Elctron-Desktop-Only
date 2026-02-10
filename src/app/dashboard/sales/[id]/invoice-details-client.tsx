
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, FileText, Download, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function InvoiceDetailsClient({ invoice, dict, currency }: { invoice: any, dict: any, currency: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/sales">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {dict.Sales?.Invoice?.SimpleTitle || "Invoice"} #{invoice.invoiceNumber}
                        </h1>
                        <p className="text-muted-foreground">{dict.Sales?.Description || "Details"}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/sales/${invoice.id}/print`} target="_blank">
                        <Button variant="outline" className="gap-2">
                            <Download size={16} />
                            {dict.Sales?.Table?.Print || "Print"}
                        </Button>
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User size={14} /> {dict.Sales?.Table?.Customer || "Customer"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{invoice.customerName}</div>
                        {invoice.customer?.phone && <div className="text-sm text-muted-foreground">{invoice.customer.phone}</div>}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar size={14} /> {dict.Sales?.Table?.Date || "Date"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{invoice.issueDate}</div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1">
                            {invoice.createdAt ? new Date(invoice.createdAt).toLocaleTimeString() : ''}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText size={14} /> {dict.Sales?.Table?.Status || "Status"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={invoice.status === 'paid' ? 'secondary' : 'outline'}>
                            {invoice.status === 'paid' ? dict.Sales?.Table?.Paid :
                                invoice.status === 'issued' ? dict.Sales?.Table?.Issued :
                                    invoice.status === 'returned' ? dict.Sales?.Table?.StatusLabels?.Returned :
                                        invoice.status === 'partially_returned' ? dict.Sales?.Table?.StatusLabels?.PartiallyReturned :
                                            invoice.status.toUpperCase()}
                        </Badge>
                        <div className="mt-1 text-sm font-medium text-muted-foreground">
                            {invoice.paymentMethod === 'cash' ? dict.Sales?.Table?.Cash :
                                invoice.paymentMethod === 'credit' ? dict.Sales?.Table?.Credit :
                                    invoice.paymentMethod === 'card' ? dict.Sales?.Table?.Card :
                                        invoice.paymentMethod}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{dict.Sales?.Form?.ItemDescription || "Items"}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{dict.Sales?.Table?.Item || "Item"}</TableHead>
                                <TableHead className="text-center">{dict.Sales?.Table?.Qty || "Quantity"}</TableHead>
                                <TableHead className="text-end">{dict.Sales?.Table?.UnitPrice || "Unit Price"}</TableHead>
                                <TableHead className="text-end">{dict.Sales?.Table?.Subtotal || "Subtotal"}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item: any, idx: number) => (
                                <TableRow key={idx}>
                                    <TableCell className="font-medium">{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-end dir-ltr">{formatCurrency(item.unitPrice, currency)}</TableCell>
                                    <TableCell className="text-end font-bold dir-ltr">{formatCurrency(item.quantity * item.unitPrice, currency)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-8 flex justify-end">
                        <div className="w-full md:w-1/3 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span>{dict.Sales?.Table?.Total || "Total"}</span>
                                <span className="font-black text-xl dir-ltr">{formatCurrency(invoice.totalAmount, currency)}</span>
                            </div>
                            {Number(invoice.amountPaid) > 0 && (
                                <>
                                    <div className="flex justify-between text-sm text-green-600 font-bold">
                                        <span>{dict.Sales?.Table?.Paid || "Paid"}</span>
                                        <span className="dir-ltr">{formatCurrency(invoice.amountPaid, currency)}</span>
                                    </div>
                                    <div className="flex justify-between border-t pt-2 font-black text-red-600">
                                        <span>{dict.Sales?.Remaining || "Remaining"}</span>
                                        <span className="dir-ltr">{formatCurrency(Number(invoice.totalAmount) - Number(invoice.amountPaid), currency)}</span>
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
