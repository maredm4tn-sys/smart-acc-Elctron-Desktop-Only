"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "@/components/providers/i18n-provider";
import { payRepresentativeCommission } from "../actions";
import { toast } from "sonner";
import { useTransition } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PayCommissionDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    data: {
        representativeId: number;
        amount: number;
        period: string;
        name: string;
        currency: string;
    };
}

export function PayCommissionDialog({ open, setOpen, data }: PayCommissionDialogProps) {
    const { dict: rawDict } = useTranslation() as any;
    const dict = rawDict;
    const [isPending, startTransition] = useTransition();
    const [confirmOpen, setConfirmOpen] = useState(false);

    const handleConfirm = () => {
        startTransition(async () => {
            const result = await payRepresentativeCommission({
                representativeId: data.representativeId,
                amount: data.amount,
                period: data.period,
            });

            if (result.success && result.data?.success) {
                toast.success(result.data.message );
                setOpen(false);
            } else {
                toast.error(result.message || result.data?.message );
            }
        });
    };

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{dict.Common?.Confirm}</DialogTitle>
                        <DialogDescription>
                            {dict.Representatives?.SettlementPrompt}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right col-span-1">{dict.Representatives?.Name}</Label>
                            <Input value={data.name} disabled className="col-span-3 bg-muted" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right col-span-1">{dict.Representatives?.Reports?.Period}</Label>
                            <Input value={data.period} disabled className="col-span-3 bg-muted text-xs" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right col-span-1">{dict.Common?.Amount}</Label>
                            <div className="col-span-3 flex items-center gap-2">
                                <Input value={data.amount.toFixed(2)} disabled className="bg-muted font-bold text-green-700" />
                                <span className="text-sm font-bold">{data.currency}</span>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>{dict.Common?.Cancel}</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={() => setConfirmOpen(true)}
                        >
                            {dict.Representatives?.Reports?.Settle}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{dict.Common?.Confirm}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {dict.Representatives?.SettlementPrompt}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{dict.Common?.Cancel}</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirm}
                            disabled={isPending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isPending ? (dict.Common?.Loading) : (dict.Common?.Confirm)}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
