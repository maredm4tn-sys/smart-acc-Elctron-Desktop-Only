"use client";

import { usePOS } from "../context/pos-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, CreditCard, Banknote, Building2 } from "lucide-react";
import { useState, useEffect } from "react";
import { usePOSActions } from "../hooks/use-pos-actions";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { formatNumber } from "@/lib/numbers";

export function POSFooter() {
    const { totals, setTotals, isLoading, header, setHeader, settings, setSettings } = usePOS();
    const { dict } = useTranslation();
    const { currency } = useSettings();
    const { handleIssueInvoice, isProcessing } = usePOSActions();

    // Local state for auto print
    const [autoPrint, setAutoPrint] = useState(true);

    // Tax Toggle Handler
    const handleTaxChange = (checked: boolean) => {
        const rate = (settings as any)?.taxRate || 14;
        setTotals({ taxRate: checked ? rate : 0 });
    };

    // Checkout wrapper with auto-print
    const handleCheckout = async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        await handleIssueInvoice(autoPrint);
    };

    return (
        <div className="bg-white border-t p-3 flex flex-col gap-2 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-20 no-print">

            {/* Subtotal Row */}
            <div className="flex justify-between items-center text-slate-500 font-bold">
                <span className="text-sm font-mono">{formatNumber(totals.subtotal.toFixed(2))}</span>
                <span className="text-[11px]">{dict.Sales?.Table?.Subtotal}</span>
            </div>

            {/* Conditional Tax Row - ONLY IF ENABLED IN SETTINGS */}
            {((settings as any)?.taxEnabled && totals.taxRate > 0) && (
                <div className="flex justify-between items-center text-orange-600 font-bold animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-mono">+{formatNumber((totals.taxAmount + ((totals.subtotal - totals.discountAmount) * (totals.taxRate / 100))).toFixed(2))}</span>
                    <span className="text-[10px]">{dict.Sales?.Table?.Tax} ({formatNumber((settings as any)?.taxRate || 14)}%)</span>
                </div>
            )}

            {/* Conditional Discount Row */}
            {totals.discountAmount > 0 && (
                <div className="flex justify-between items-center text-green-600 font-bold animate-in fade-in slide-in-from-top-1 duration-200">
                    <span className="text-sm font-mono">-{formatNumber(totals.discountAmount.toFixed(2))}</span>
                    <span className="text-[10px]">{dict.Sales?.Table?.Discount}</span>
                </div>
            )}

            <div className="h-[1px] bg-slate-100 my-1" />

            {/* Total Row */}
            <div className="flex justify-between items-center mb-1">
                <div className="flex items-baseline gap-1">
                    <span className="text-[10px] text-slate-400 font-bold">{currency}</span>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">{formatNumber(totals.total.toFixed(2))}</span>
                </div>
                <span className="font-black text-xl text-slate-800">{dict.Sales?.Table?.Total}</span>
            </div>

            {/* Calculations Row: Tax & Discount */}
            <div className="grid grid-cols-2 gap-2 mb-0.5">
                {/* Tax Checkbox - ONLY IF ENABLED IN SYSTEM SETTINGS */}
                {(settings as any)?.taxEnabled ? (
                    <div className="flex items-center justify-center gap-2 border rounded-lg h-9 bg-slate-50 border-slate-200 hover:border-blue-400 transition-all cursor-pointer px-2" onClick={() => handleTaxChange(totals.taxRate === 0)}>
                        <Checkbox
                            id="tax-mode"
                            checked={totals.taxRate > 0}
                            onCheckedChange={(c) => handleTaxChange(c as boolean)}
                            className="rounded-full w-4 h-4 border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 shadow-none"
                        />
                        <Label htmlFor="tax-mode" className="cursor-pointer text-[10px] font-extrabold text-slate-600 leading-none">{dict.Sales?.Table?.Tax}</Label>
                    </div>
                ) : <div />}

                {/* Discount Box */}
                <div className="relative group">
                    <Input
                        placeholder="."
                        className="text-center font-black h-9 border-slate-200 bg-slate-50 rounded-lg focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                        value={totals.discountAmount > 0 ? totals.discountAmount : ''}
                        onChange={(e) => setTotals({ discountAmount: Number(e.target.value) })}
                    />
                    <span className="absolute right-2 top-2.5 text-[9px] text-slate-400 font-black uppercase pointer-events-none group-focus-within:text-blue-500">{dict?.Sales?.Table?.Discount}</span>
                </div>
            </div>

            {/* Payment Methods Tabs */}
            <Tabs value={header.paymentMethod} onValueChange={(v: any) => setHeader({ paymentMethod: v })} className="w-full">
                <TabsList className="w-full grid grid-cols-3 h-8 bg-slate-100 p-1 rounded-lg">
                    <TabsTrigger value="credit" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">{dict?.POS?.Credit}</TabsTrigger>
                    <TabsTrigger value="card" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">{dict?.POS?.Card}</TabsTrigger>
                    <TabsTrigger value="cash" className="text-[10px] font-black rounded-md data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">{dict?.POS?.Cash}</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Credit Due Date Selector - POS Style */}
            {header.paymentMethod === 'credit' && (
                <div className="bg-amber-50 p-2 rounded-lg border border-amber-100 flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-amber-800 uppercase italic">
                            {dict?.Sales?.Invoice?.Form?.DueDate}
                        </span>
                        <input
                            id="pos-due-date"
                            type="date"
                            aria-label={dict?.Sales?.Invoice?.Form?.DueDate}
                            className="bg-white border-amber-200 outline-none rounded-md px-2 py-0.5 text-[11px] font-bold text-amber-900"
                            value={header.dueDate ? (header.dueDate instanceof Date ? header.dueDate.toISOString().split('T')[0] : header.dueDate) : ''}
                            onChange={(e) => setHeader({ dueDate: new Date(e.target.value) })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                        {[7, 14, 30].map(days => (
                            <Button
                                key={days}
                                type="button"
                                variant="ghost"
                                className="h-6 text-[9px] font-black bg-white/50 hover:bg-white text-amber-700 border border-amber-100/50 rounded-md"
                                onClick={() => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + days);
                                    setHeader({ dueDate: d });
                                }}
                            >
                                +{days} d
                            </Button>
                        ))}
                    </div>
                </div>
            )}

            {/* Big Checkout Button */}
            <Button
                type="button"
                size="lg"
                className="w-full bg-blue-600 hover:bg-blue-700 h-14 text-xl font-black rounded-xl mt-0.5 shadow-lg shadow-blue-100 transition-all active:scale-[0.98]"
                onClick={(e) => handleCheckout(e)}
                disabled={isLoading || isProcessing}
            >
                <div className="flex items-center gap-2">
                    <Banknote size={24} />
                    <span>
                        {header.paymentMethod === 'cash'
                            ? (dict?.POS?.PayCash)
                            : header.paymentMethod === 'card'
                                ? (dict?.POS?.PayCard)
                                : (dict?.POS?.PayCredit)}
                    </span>
                </div>
            </Button>

            {/* Auto Print & Layout Control */}
            <div className="flex flex-col gap-2 py-0.5 border-t mt-1 pt-2">
                <div className="flex justify-between items-center px-1">
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="auto-print"
                            checked={autoPrint}
                            onCheckedChange={(c) => setAutoPrint(c as boolean)}
                            className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600 rounded w-3.5 h-3.5"
                        />
                        <Label htmlFor="auto-print" className="text-[10px] text-slate-500 font-extrabold cursor-pointer">{dict?.POS?.AutoPrint}</Label>
                    </div>

                    <Tabs
                        value={settings.printLayout}
                        onValueChange={(v: any) => setSettings({ printLayout: v })}
                        className="h-7"
                    >
                        <TabsList className="h-7 bg-slate-200/50 p-0.5">
                            <TabsTrigger value="standard" className="text-[9px] font-black h-6 px-2">A4</TabsTrigger>
                            <TabsTrigger value="thermal" className="text-[9px] font-black h-6 px-2">📟</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

        </div>
    );
}
