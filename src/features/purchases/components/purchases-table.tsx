"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, RotateCcw, Pencil, Trash2, Printer } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Badge } from "@/components/ui/badge";
import { ReturnPurchaseDialog } from "./return-purchase-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function PurchasesTable({ initialInvoices }: { initialInvoices: any[] }) {
    const { dict: rawDict, dir } = useTranslation();
    const dict = rawDict as any;

    const [invoices, setInvoices] = useState<any[]>(initialInvoices || []);
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
    const [showReturnDialog, setShowReturnDialog] = useState(false);

    // Direction helper
    const isRtl = dir === "rtl";

    return (
        <div className="space-y-6" dir={dir}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Purchases.Title}</h1>
                    <p className="text-sm text-muted-foreground">{dict.Purchases.Description}</p>
                </div>
                <Link href="/dashboard/purchases/create" className="w-full sm:w-auto">
                    <Button className="gap-2 w-full sm:w-auto">
                        <Plus size={16} />
                        <span>{dict.Purchases.NewInvoice}</span>
                    </Button>
                </Link>
            </div>


            {/* Desktop View */}
            <div className="hidden md:block bg-white p-4 rounded-lg border shadow-sm container-desktop">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.InvoiceNumber}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.Supplier}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.Date}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.Status}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.Total}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.PaidAmount}</TableHead>
                            <TableHead className="text-start font-black text-slate-900">{dict.Purchases.Table.Balance}</TableHead>
                            <TableHead className="text-start font-black text-slate-900 pr-4 w-[140px]">{dict.Purchases.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    {dict.Purchases.Table.NoInvoices}
                                </TableCell>
                            </TableRow>
                        ) : (
                            invoices.map((inv) => (
                                <TableRow key={inv.id} className={inv.type === 'return' ? 'bg-red-50/30' : 'hover:bg-slate-50/50 transition-colors'}>
                                    <TableCell className="font-bold text-start text-slate-900">
                                        <Link href={`/dashboard/purchases/${inv.id}`} className="flex items-center gap-2 hover:text-blue-600 transition-colors">
                                            <FileText className="h-4 w-4 text-gray-400 shrink-0" />
                                            <span className="truncate">{inv.invoiceNumber === 'DRAFT' ? dict.Purchases.Table.Draft : inv.invoiceNumber}</span>
                                            {inv.type === 'return' && <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-1 h-5 text-[10px]">{dict.Purchases.Table.Returned}</Badge>}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-start font-bold text-slate-700">{inv.supplier ? inv.supplier.name : inv.supplierName}</TableCell>
                                    <TableCell className="text-start text-xs font-bold text-slate-500 tabular-nums">
                                        {inv.issueDate}
                                    </TableCell>
                                    <TableCell className="text-start">
                                        <Badge variant="outline" className="font-black text-[10px] rounded-full px-3">
                                            {inv.paymentStatus === 'paid' ? dict.Purchases.Table.StatusLabels.Paid :
                                                inv.paymentStatus === 'unpaid' ? dict.Purchases.Table.StatusLabels.Unpaid :
                                                    inv.paymentStatus === 'partial' ? dict.Purchases.Table.StatusLabels.Partial : inv.paymentStatus}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-black text-start text-slate-900 tabular-nums">
                                        {(Number(inv.totalAmount)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-start text-emerald-600 font-bold tabular-nums">
                                        {(Number(inv.amountPaid || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-start text-rose-600 font-black tabular-nums">
                                        {(Number(inv.totalAmount) - Number(inv.amountPaid || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-start pr-2">
                                        <TooltipProvider delayDuration={100}>
                                            <div className="flex gap-1 justify-start">
                                                {/* Print Button */}
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-slate-600 hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                                                            onClick={() => window.open(`/print/purchases/${inv.id}?type=standard`, '_blank')}
                                                        >
                                                            <Printer size={16} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{dict.Common?.Print}</TooltipContent>
                                                </Tooltip>

                                                {inv.type !== 'return' && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Link href={`/dashboard/purchases/edit/${inv.id}`}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 h-8 w-8"
                                                                >
                                                                    <Pencil size={16} />
                                                                </Button>
                                                            </Link>
                                                        </TooltipTrigger>
                                                        <TooltipContent>{dict.Purchases.Table.Edit}</TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 h-8 w-8"
                                                            onClick={() => {
                                                                setSelectedInvoice(inv);
                                                                setShowReturnDialog(true);
                                                            }}
                                                        >
                                                            <RotateCcw size={16} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{dict.Purchases.Table.Return}</TooltipContent>
                                                </Tooltip>

                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                                                            onClick={() => {
                                                                if (confirm(dict.Common?.ConfirmDelete)) {
                                                                    alert("Delete action requested");
                                                                }
                                                            }}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{dict.Common?.Delete}</TooltipContent>
                                                </Tooltip>
                                            </div>
                                        </TooltipProvider>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View - Simplified */}
            <div className="md:hidden space-y-4">
                {invoices.length === 0 && (
                    <div className="text-center text-gray-500 py-8">{dict.Purchases.Table.NoInvoices}</div>
                )}
                {invoices.map((inv) => (
                    <Card key={inv.id} className={inv.type === 'return' ? 'border-red-200 bg-red-50/20' : ''}>
                        <CardHeader className="p-4">
                            <div className="flex justify-between">
                                <span className="font-bold flex items-center gap-2">
                                    {inv.invoiceNumber === 'DRAFT' ? dict.Purchases.Table.Draft : inv.invoiceNumber}
                                    {inv.type === 'return' && <Badge className="bg-red-100 text-red-700 scale-75">{dict.Purchases.Table.Returned}</Badge>}
                                </span>
                                <span className="text-sm">{inv.issueDate}</span>
                            </div>
                            <div className="text-sm text-gray-500">{inv.supplierName}</div>
                        </CardHeader>
                        <CardContent className="p-4 pt-0">
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed">
                                <div className="text-xs text-gray-500">{dict.Purchases.Table.Total}</div>
                                <div className="font-bold">{Number(inv.totalAmount).toLocaleString()} EGP</div>
                            </div>
                            <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed">
                                <div className="text-xs text-green-600">{dict.Purchases.Table.PaidAmount}</div>
                                <div className="font-medium text-green-600">{Number(inv.amountPaid || 0).toLocaleString()} EGP</div>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <div className="text-xs text-red-600 font-bold">{dict.Purchases.Table.Balance}</div>
                                <div className="font-bold text-red-600 underline">{(Number(inv.totalAmount) - Number(inv.amountPaid || 0)).toLocaleString()} EGP</div>
                            </div>

                            <div className="flex justify-between items-center">
                                <Badge variant="outline">
                                    {inv.paymentStatus === 'paid' ? dict.Purchases.Table.StatusLabels.Paid :
                                        inv.paymentStatus === 'unpaid' ? dict.Purchases.Table.StatusLabels.Unpaid :
                                            inv.paymentStatus === 'partial' ? dict.Purchases.Table.StatusLabels.Partial : inv.paymentStatus}
                                </Badge>
                                {inv.type !== 'return' && (
                                    <div className="flex gap-2">
                                        <Link href={`/dashboard/purchases/edit/${inv.id}`}>
                                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200">
                                                <Pencil size={14} />
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-orange-600 border-orange-200"
                                            onClick={() => {
                                                setSelectedInvoice(inv);
                                                setShowReturnDialog(true);
                                            }}
                                        >
                                            <RotateCcw size={14} />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {selectedInvoice && (
                <ReturnPurchaseDialog
                    open={showReturnDialog}
                    onOpenChange={setShowReturnDialog}
                    invoice={selectedInvoice}
                />
            )}
        </div>
    );
}
