"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw, ArrowLeftRight } from "lucide-react";
import { createReturnInvoice, getInvoiceWithItems } from "@/features/sales/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useTranslation } from "@/components/providers/i18n-provider"; // Added translation hook

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    productId: number;
}

interface ReturnInvoiceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: {
        id: number;
        invoiceNumber: string;
        items: InvoiceItem[];
    };
}

export function ReturnInvoiceDialog({ open, onOpenChange, invoice }: ReturnInvoiceDialogProps) {
    const { dict } = useTranslation() as any; // Using dict
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [fullInvoice, setFullInvoice] = useState<any>(invoice);
    const [isLoadingItems, setIsLoadingItems] = useState(false);
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

    useEffect(() => {
        if (open && invoice?.id) {
            if (!invoice.items || invoice.items.length === 0) {
                setIsLoadingItems(true);
                getInvoiceWithItems(invoice.id).then(res => {
                    if (res && res.success) {
                        setFullInvoice(res.data);
                    } else {
                        toast.error(dict.Sales?.Invoice?.Error || "Failed to load invoice items");
                    }
                    setIsLoadingItems(false);
                });
            } else {
                setFullInvoice(invoice);
            }
        }
    }, [open, invoice, dict]);

    const handleQuantityChange = (itemId: number, maxQty: number, value: string) => {
        const qty = parseFloat(value);
        if (isNaN(qty) || qty < 0) {
            setReturnQuantities(prev => ({ ...prev, [itemId]: 0 }));
            return;
        }
        if (qty > maxQty) {
            toast.error(dict.Invoices?.Errors?.ReturnQtyLimit || "Quantity exceeds original invoice quantity");
            setReturnQuantities(prev => ({ ...prev, [itemId]: maxQty }));
            return;
        }
        setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
    };

    const calculateTotalRefund = () => {
        let total = 0;
        const items = fullInvoice?.items || [];
        items.forEach((item: any) => {
            const qty = returnQuantities[item.id] || 0;
            total += qty * Number(item.unitPrice);
        });
        return total;
    };

    const handleReturn = async () => {
        if (!fullInvoice?.items) {
            toast.error(dict.Sales?.Invoice?.Error || "Incomplete invoice data");
            return;
        }

        const itemsToReturn = fullInvoice.items
            .map((item: any) => ({
                productId: item.productId,
                description: item.description,
                quantity: returnQuantities[item.id] || 0,
                unitPrice: Number(item.unitPrice)
            }))
            .filter((item: any) => item.quantity > 0);

        if (itemsToReturn.length === 0) {
            toast.warning(dict.Sales?.Returns?.Messages?.SelectItems || "Please select at least one item to return");
            return;
        }

        setIsPending(true);
        try {
            const result = await createReturnInvoice({
                originalInvoiceId: invoice.id,
                returnDate: new Date().toISOString().split('T')[0],
                items: itemsToReturn
            });

            if (result.success) {
                toast.success(result.message);
                onOpenChange(false);
                setReturnQuantities({});
                router.refresh();
                window.location.reload();
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(dict.Common?.Errors?.Unexpected || "An unexpected error occurred");
        } finally {
            setIsPending(false);
        }
    };

    const handleReturnAll = () => {
        const newQuantities: Record<number, number> = {};
        fullInvoice?.items?.forEach((item: any) => {
            newQuantities[item.id] = Number(item.quantity);
        });
        setReturnQuantities(newQuantities);
    };

    const handleIncrement = (item: any) => {
        const current = returnQuantities[item.id] || 0;
        if (current < Number(item.quantity)) {
            handleQuantityChange(item.id, Number(item.quantity), (current + 1).toString());
        }
    };

    const handleDecrement = (item: any) => {
        const current = returnQuantities[item.id] || 0;
        if (current > 0) {
            handleQuantityChange(item.id, Number(item.quantity), (current - 1).toString());
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0 border-none shadow-2xl flex flex-col">
                <DialogHeader className="p-6 bg-slate-900 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500 rounded-lg">
                                <RotateCcw className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-xl font-bold">
                                    {dict.Sales?.Returns?.Title} #{invoice.invoiceNumber}
                                </DialogTitle>
                                <DialogDescription className="text-slate-400 mt-1">
                                    {dict.Sales?.Returns?.Description}
                                </DialogDescription>
                            </div>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleReturnAll}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white gap-2 transition-all"
                        >
                            <ArrowLeftRight size={14} />
                            {dict.Sales?.Table?.CreateReturn} ({dict.Common?.All})
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 custom-scrollbar min-h-0">
                    {isLoadingItems ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
                            <p className="text-sm font-medium text-slate-500 animate-pulse">{dict.Common?.Loading}</p>
                        </div>
                    ) : (
                        <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-100/50 sticky top-0 z-10">
                                    <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="text-start font-bold text-slate-600 bg-slate-50">{dict.Sales?.Form?.ItemDescription}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600 bg-slate-50">{dict.Sales?.Form?.Quantity}</TableHead>
                                        <TableHead className="text-center font-bold text-slate-600 bg-slate-50">{dict.Sales?.Form?.UnitPrice}</TableHead>
                                        <TableHead className="text-center w-[180px] font-bold text-slate-600 bg-slate-50">{dict.Sales?.Form?.ReturnQty}</TableHead>
                                        <TableHead className="text-end font-bold text-slate-600 bg-slate-50">{dict.Sales?.Form?.Total}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {(fullInvoice?.items || []).map((item: any) => (
                                        <TableRow key={item.id} className="hover:bg-orange-50/20 transition-colors border-slate-100 italic-none">
                                            <TableCell className="text-start font-medium text-slate-700">{item.description}</TableCell>
                                            <TableCell className="text-center text-slate-500">{item.quantity}</TableCell>
                                            <TableCell className="text-center font-mono text-slate-600">{Number(item.unitPrice).toFixed(2)}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-sm hover:bg-orange-100 hover:text-orange-600"
                                                        onClick={() => handleDecrement(item)}
                                                    >
                                                        -
                                                    </Button>
                                                    <Input
                                                        type="number"
                                                        min="0"
                                                        max={item.quantity}
                                                        value={returnQuantities[item.id] || ''}
                                                        onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)}
                                                        placeholder="0"
                                                        className="h-8 w-16 text-center font-bold bg-slate-50 border-slate-200 focus:bg-white focus:ring-1 focus:ring-orange-500 transition-all rounded-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-7 w-7 rounded-sm hover:bg-orange-100 hover:text-orange-600"
                                                        onClick={() => handleIncrement(item)}
                                                    >
                                                        +
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-end font-bold text-orange-600 dir-ltr font-mono">
                                                {((returnQuantities[item.id] || 0) * Number(item.unitPrice)).toFixed(2)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <div className="shrink-0 bg-white p-6 border-t border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] z-20">
                    <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-1">
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">{dict.Sales?.Form?.TotalReturn}</span>
                            <div className="flex items-center gap-2">
                                <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                                    {calculateTotalRefund().toFixed(2)}
                                </span>
                                <span className="text-sm font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                    {dict.Settings?.Form?.CurrencySymbol}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isPending}
                                className="rounded-xl px-6 h-12 border-slate-200 hover:bg-slate-50 transition-all font-bold"
                            >
                                {dict.Common?.Cancel}
                            </Button>
                            <Button
                                onClick={handleReturn}
                                disabled={isPending || calculateTotalRefund() === 0}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl px-8 h-12 shadow-lg shadow-orange-200 transition-all font-bold gap-2"
                            >
                                {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
                                {dict.Sales?.Returns?.Confirm}
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
