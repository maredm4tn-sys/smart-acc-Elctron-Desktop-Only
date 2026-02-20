"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Loader2, RotateCcw } from "lucide-react";
import { createPurchaseReturnInvoice } from "@/features/purchases/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/i18n-provider";

interface PurchaseItem {
    id: number;
    description: string;
    quantity: string | number;
    unitCost: string | number;
    productId: number;
}

interface ReturnPurchaseDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    invoice: {
        id: number;
        invoiceNumber: string;
        items: PurchaseItem[];
    };
}

export function ReturnPurchaseDialog({ open, onOpenChange, invoice }: ReturnPurchaseDialogProps) {
    const { dict: rawDict } = useTranslation() as any;
    const dict = rawDict;
    const router = useRouter();
    const [isPending, setIsPending] = useState(false);
    const [returnQuantities, setReturnQuantities] = useState<Record<number, number>>({});

    const handleQuantityChange = (itemId: number, maxQty: number, value: string) => {
        const qty = parseFloat(value);
        if (isNaN(qty) || qty < 0) {
            setReturnQuantities(prev => ({ ...prev, [itemId]: 0 }));
            return;
        }
        if (qty > maxQty) {
            toast.error(dict.Purchases?.Return?.ErrorQtyLimit);
            setReturnQuantities(prev => ({ ...prev, [itemId]: maxQty }));
            return;
        }
        setReturnQuantities(prev => ({ ...prev, [itemId]: qty }));
    };

    const calculateTotalRefund = () => {
        let total = 0;
        invoice.items.forEach(item => {
            const qty = returnQuantities[item.id] || 0;
            total += qty * Number(item.unitCost);
        });
        return total;
    };

    const handleReturn = async () => {
        const itemsToReturn = invoice.items
            .map(item => ({
                productId: item.productId,
                description: item.description,
                quantity: returnQuantities[item.id] || 0,
                unitCost: Number(item.unitCost)
            }))
            .filter(item => item.quantity > 0);

        if (itemsToReturn.length === 0) {
            toast.warning(dict.Purchases?.Return?.ErrorEmptySelection);
            return;
        }

        setIsPending(true);
        try {
            const result = await createPurchaseReturnInvoice({
                originalInvoiceId: invoice.id,
                returnDate: new Date().toISOString().split('T')[0],
                items: itemsToReturn
            });

            if (result.success) {
                toast.success(result.message );
                onOpenChange(false);
                setReturnQuantities({});
                router.refresh();
                window.location.reload();
            } else {
                toast.error(result.error );
            }
        } catch (error) {
            console.error(error);
            toast.error(dict.Common?.Error);
        } finally {
            setIsPending(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <RotateCcw className="h-5 w-5 text-red-500" />
                        {dict.Purchases?.Return?.Title} - {invoice.invoiceNumber}
                    </DialogTitle>
                    <DialogDescription>
                        {dict.Purchases?.Return?.Description}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{dict.Common?.Item}</TableHead>
                                <TableHead className="text-center">{dict.Purchases?.Table?.QtyBought}</TableHead>
                                <TableHead className="text-center">{dict.Purchases?.Form?.Cost}</TableHead>
                                <TableHead className="text-center w-[150px]">{dict.Purchases?.Table?.QtyReturn}</TableHead>
                                <TableHead className="font-bold">{dict.Purchases?.Table?.Total}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {invoice.items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell className="text-center">{item.quantity}</TableCell>
                                    <TableCell className="text-center">{Number(item.unitCost).toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            min="0"
                                            max={Number(item.quantity)}
                                            value={returnQuantities[item.id] || ''}
                                            onChange={(e) => handleQuantityChange(item.id, Number(item.quantity), e.target.value)}
                                            placeholder="0"
                                            className="text-center font-bold"
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-red-600">
                                        {((returnQuantities[item.id] || 0) * Number(item.unitCost)).toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="mt-6 flex justify-between items-center bg-red-50 p-4 rounded-lg border border-red-100">
                        <span className="font-bold text-gray-700">{dict.Purchases?.Form?.Total}:</span>
                        <span className="text-2xl font-bold text-red-600">
                            {calculateTotalRefund().toFixed(2)}
                        </span>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
                        {dict.Common?.Cancel}
                    </Button>
                    <Button
                        onClick={handleReturn}
                        disabled={isPending || calculateTotalRefund() === 0}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {dict.Common?.Confirm}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
