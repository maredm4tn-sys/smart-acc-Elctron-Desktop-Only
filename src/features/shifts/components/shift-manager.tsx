"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { openShift, closeShift, getShiftSummary } from "@/features/shifts/actions";
import { useShift } from "../context/shift-context";
import { toast } from "sonner";
import { Lock, Play, Printer } from "lucide-react";
import { ShiftReceipt } from "./shift-receipt";
import { useTranslation } from '@/components/providers/i18n-provider';

export function ShiftManager() {
    const { dict } = useTranslation();
    const { activeShift, checkActiveShift } = useShift();
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<'menu' | 'open' | 'close-count' | 'close-summary'>('menu');

    // Open Shift State
    const [startBalance, setStartBalance] = useState("0");

    // Close Shift State
    const [actualCash, setActualCash] = useState("");
    const [notes, setNotes] = useState("");
    const [summary, setSummary] = useState<any>(null);
    const [closingData, setClosingData] = useState<any>(null);

    const handlePrint = () => {
        if (!closingData?.shiftId) return;
        const url = `/print/shifts/${closingData.shiftId}`;
        window.open(url, '_blank');
        resetState();
    };

    useEffect(() => {
        if (isOpen) {
            setStep('menu');
            setStartBalance("0");
            setActualCash("");
            setNotes("");
            setSummary(null);

            if (!activeShift) {
                setStep('open');
            }
        }
    }, [isOpen, activeShift]);

    const resetState = () => {
        setStep('menu');
        setIsOpen(false);
        checkActiveShift();
    };

    const handleOpenShift = async () => {
        setLoading(true);
        try {
            const res = await openShift(Number(startBalance));
            if (res.success) {
                toast.success(dict.Shifts.OpenSuccess);
                setTimeout(() => window.location.reload(), 500);
                resetState();
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error(dict.Common.Error);
        } finally {
            setLoading(false);
        }
    };

    const prepareClose = async () => {
        setLoading(true);
        try {
            const data = await getShiftSummary(activeShift.id);
            setSummary(data);
            setStep('close-count');
        } catch (e) {
            toast.error(dict.Shifts.ErrorLoading);
        } finally {
            setLoading(false);
        }
    };

    const handleCloseShift = async () => {
        setLoading(true);
        try {
            const systemCash = Number(activeShift.startBalance || 0) + (summary?.netCashMovement || 0);
            const actual = Number(actualCash || 0);
            const diff = actual - systemCash;

            const res = await closeShift(activeShift.id, actual, notes);
            if (res.success) {
                toast.success(dict.Shifts.CloseSuccess);
                setTimeout(() => window.location.reload(), 2000);

                setClosingData({
                    shiftId: activeShift.id,
                    shiftNumber: activeShift.shiftNumber,
                    startTime: activeShift.startTime,
                    endTime: new Date(),
                    cashierName: "Current User",
                    startBalance: Number(activeShift.startBalance || 0),
                    endBalance: actual,
                    expectedCash: systemCash,
                    cashSales: summary.cashSales,
                    visaSales: summary.visaSales,
                    unpaidSales: summary.unpaidSales,
                    expensesTotal: summary.payments,
                    difference: diff
                });

                setStep('close-summary');
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error(dict.Shifts.ErrorClosing);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button variant={activeShift ? "destructive" : "default"} size="sm" className="gap-2 px-4 h-10 font-bold rounded-xl shadow-sm transition-all hover:scale-105 active:scale-95">
                    {activeShift ? (
                        <><Lock size={16} /> <span>{dict.Shifts.CloseTitle} #{activeShift.shiftNumber}</span></>
                    ) : (
                        <><Play size={16} /> <span>{dict.Shifts.OpenButton}</span></>
                    )}
                </Button>
            </DialogTrigger>

            {step === 'close-summary' && closingData ? (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{dict.Shifts.ReportTitle}</DialogTitle>
                        <DialogDescription>{dict.Shifts.ReportDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-center bg-gray-100 p-4 border rounded">
                        <ShiftReceipt data={closingData} />
                    </div>
                    <DialogFooter>
                        <Button onClick={handlePrint} className="gap-2">
                            <Printer size={16} /> {dict.Shifts.PrintDone}
                        </Button>
                        <Button variant="outline" onClick={resetState}>{dict.Shifts.CloseAction}</Button>
                    </DialogFooter>
                </DialogContent>
            ) : (
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{activeShift ? `${dict.Shifts.CloseTitle} #${activeShift.shiftNumber}` : dict.Shifts.OpenTitle}</DialogTitle>
                        <DialogDescription>
                            {activeShift ? dict.Shifts.NotesPlaceholder : dict.Shifts.StartBalance}
                        </DialogDescription>
                    </DialogHeader>

                    {step === 'open' && (
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>{dict.Shifts.StartBalance}</Label>
                                <Input
                                    type="number"
                                    value={startBalance}
                                    onChange={(e) => setStartBalance(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <Button onClick={handleOpenShift} disabled={loading} className="w-full">
                                {loading ? dict.Shifts.StartingShift : dict.Shifts.OpenButton}
                            </Button>
                        </div>
                    )}

                    {step === 'menu' && activeShift && (
                        <div className="space-y-4 py-4">
                            <div className="p-4 bg-blue-50 text-blue-800 rounded-lg text-sm">
                                {dict.Shifts.StatusActive.replace('{number}', activeShift.shiftNumber).replace('{time}', new Date(activeShift.startTime).toLocaleTimeString())}
                            </div>
                            <Button onClick={prepareClose} disabled={loading} variant="destructive" className="w-full">
                                {loading ? dict.Common.Loading : dict.Shifts.CloseButton}
                            </Button>
                        </div>
                    )}

                    {step === 'close-count' && summary && (
                        <div className="space-y-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                                <div className="bg-gray-50 p-2 rounded border">
                                    <span className="block text-gray-500 text-xs">{dict.Shifts.CashSales}</span>
                                    <span className="font-bold">{Number(summary.cashSales).toFixed(2)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded border">
                                    <span className="block text-gray-500 text-xs">{dict.Shifts.VisaSales}</span>
                                    <span className="font-bold">{Number(summary.visaSales).toFixed(2)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded border">
                                    <span className="block text-gray-500 text-xs">{dict.Shifts.Expenses}</span>
                                    <span className="font-bold text-red-600">-{Number(summary.payments).toFixed(2)}</span>
                                </div>
                                <div className="bg-gray-50 p-2 rounded border">
                                    <span className="block text-gray-500 text-xs">{dict.Shifts.ExpectedCash}</span>
                                    <span className="font-bold text-blue-600">
                                        {(Number(activeShift.startBalance || 0) + summary.netCashMovement).toFixed(2)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>{dict.Shifts.ActualCash}</Label>
                                <Input
                                    type="number"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    placeholder={dict.Shifts.CashPlaceholder}
                                    autoFocus
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>{dict.Shifts.Notes}</Label>
                                <Input
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder={dict.Shifts.NotesPlaceholder}
                                />
                            </div>

                            {actualCash && (
                                <div className={`text-sm text-center font-bold p-2 rounded ${Number(actualCash) - (Number(activeShift.startBalance || 0) + summary.netCashMovement) === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                    }`}>
                                    {dict.Shifts.Difference}: {(Number(actualCash) - (Number(activeShift.startBalance || 0) + summary.netCashMovement)).toFixed(2)}
                                </div>
                            )}

                            <Button onClick={handleCloseShift} disabled={loading} variant="destructive" className="w-full">
                                {loading ? dict.Shifts.ClosingShift : dict.Shifts.ConfirmClose}
                            </Button>
                        </div>
                    )}
                </DialogContent>
            )}
        </Dialog>
    );
}
