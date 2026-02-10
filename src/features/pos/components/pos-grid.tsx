"use client";

import { usePOS } from "../context/pos-context";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Minus, ShoppingCart, BarChart3 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { useState, useEffect } from "react";
import { getDailySummary } from "../actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

import { POSFooter } from "./pos-footer";
import { CustomerCombobox } from "./customer-combobox";
import { useTranslation } from "@/components/providers/i18n-provider";
import { Num } from "@/components/ui/num";

export function POSGrid() {
    const { dict, lang, dir } = useTranslation();
    const { items, removeFromCart, updateItem, clearCart, header, setHeader, customers, settings } = usePOS();
    const [summary, setSummary] = useState<{ totalSales: number; invoiceCount: number; cash: number; card: number; credit: number } | null>(null);

    const setCustomer = (id: string) => {
        const cust = customers.find(c => String(c.id) === id) || { id: 0, name: dict?.POS?.CashCustomer || "Cash Customer" };
        const updates: any = {
            customerId: Number(id),
            customerName: cust?.name || ""
        };

        // Auto-set price level if customer has one
        if (cust && (cust as any).priceLevel) {
            updates.priceType = (cust as any).priceLevel;
        } else if (id === "0") {
            updates.priceType = 'retail';
        }

        setHeader(updates);
    };

    const fetchSummary = async () => {
        const res = await getDailySummary();
        if (res.success && res.data) {
            setSummary(res.data);
        }
    };

    useEffect(() => {
        fetchSummary();
        // Refresh summary every 2 minutes
        const interval = setInterval(fetchSummary, 120000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-white" dir={dir}>
            {/* Header: Title & Sales Summary (Fixed) */}
            <div className="p-4 border-b flex justify-between items-center bg-white shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-2 text-slate-800 font-black text-xl">
                    <ShoppingCart size={24} className="text-blue-600" />
                    <span>{dict?.Sidebar?.POS || "POS"}</span>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-blue-600 rounded-full"
                        title={dict?.POS?.FullScreen || "Full Screen"}
                        onClick={() => {
                            if (!document.fullscreenElement) {
                                document.documentElement.requestFullscreen();
                            } else {
                                if (document.exitFullscreen) {
                                    document.exitFullscreen();
                                }
                            }
                        }}
                    >
                        <BarChart3 size={18} className="rotate-90" /> {/* Using an icon that looks like expansion */}
                    </Button>
                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 gap-2 text-[11px] font-bold bg-slate-50 border-slate-200"
                                onClick={fetchSummary}
                            >
                                <BarChart3 size={14} className="text-green-600" />
                                {dict?.Dashboard?.Today || "Today's Summary"}
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-white border-none shadow-2xl rounded-3xl p-6 overflow-hidden">
                            <DialogHeader>
                                <DialogTitle className={`text-2xl font-black text-slate-800 mb-4 text-start`}>
                                    {dict.Dashboard.TodaySalesSummary || "Today's Sales Summary"}
                                </DialogTitle>
                            </DialogHeader>

                            {summary ? (
                                <div className="space-y-6">
                                    {/* Summary Cards Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 flex flex-col items-center">
                                            <span className="text-xs text-blue-400 font-bold mb-1">{dict?.Dashboard?.TotalSales || "Today's Sales"}</span>
                                            <span className="text-2xl font-black text-blue-700 tracking-tighter">
                                                <Num value={summary.totalSales} precision={2} showGrouping={true} />
                                            </span>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center">
                                            <span className="text-xs text-slate-400 font-bold mb-1">{dict?.Dashboard?.InvoicesCount || "Invoices Count"}</span>
                                            <span className="text-2xl font-black text-slate-700">
                                                <Num value={summary.invoiceCount} />
                                            </span>
                                        </div>
                                    </div>

                                    <div className="h-[1px] bg-slate-100 w-full" />

                                    {/* Detailed Breakdown List */}
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                                            <span className="font-bold text-slate-900">
                                                <Num value={summary.cash} precision={2} showGrouping={true} />
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-slate-600">{dict?.POS?.Cash || "Cash"}</span>
                                                <div className="p-2 bg-green-100 rounded-lg text-green-600">
                                                    <Trash2 size={16} className="rotate-45" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                                            <span className="font-bold text-slate-900">
                                                <Num value={summary.card} precision={2} showGrouping={true} />
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-slate-600">{dict?.POS?.Card || "Visa / Card"}</span>
                                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                                    <ShoppingCart size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-slate-50/50 p-3 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                                            <span className="font-bold text-slate-900">
                                                <Num value={summary.credit} precision={2} showGrouping={true} />
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="font-extrabold text-slate-600">{dict?.POS?.Credit || "Credit / Transfer"}</span>
                                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                    <Plus size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-10 text-center text-slate-400 font-bold">{dict?.POS?.Loading || "Loading..."}</div>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Scroll Area for Selectors + Items + Footer */}
            <div className="flex-1 w-full bg-slate-50/10 overflow-y-auto custom-scrollbar min-h-0">
                <style>{`
                    .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `}</style>

                {/* Customer & Price Type Selector (Sticky optionally) */}
                <div className="px-3 py-2 bg-slate-50 border-b grid grid-cols-2 gap-2 sticky top-0 z-10 shadow-sm">
                    <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-start">
                            {dict?.POS?.Customer?.Label || "العميل"}
                        </label>
                        <CustomerCombobox
                            customers={customers.map(c => ({ id: c.id, name: c.name, phone: c.phone || "" }))}
                            defaultValue={String(header.customerId)}
                            onSelect={(c) => setCustomer(String(c.id))}
                        />
                    </div>

                    <div className="space-y-0.5">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block text-start">
                            {dict?.POS?.PriceLevel || "فئة السعر"}
                        </label>
                        <Select value={header.priceType} onValueChange={(val: any) => setHeader({ priceType: val })}>
                            <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm text-[11px] font-bold px-2 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="retail">{dict?.POS?.Types?.Retail || "Retail"}</SelectItem>
                                <SelectItem value="wholesale">{dict?.POS?.Types?.Wholesale || "Wholesale"}</SelectItem>
                                <SelectItem value="half_wholesale">{dict?.POS?.Types?.HalfWholesale || "Half-Wholesale"}</SelectItem>
                                <SelectItem value="special">{dict?.POS?.Types?.Special || "Special"}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-between items-center px-4 py-1">
                    <button onClick={clearCart} className="text-[11px] text-red-500 font-bold flex items-center gap-1 hover:underline">
                        <Trash2 size={12} /> {dict?.Accounts?.Tree?.Delete || "Clear Cart"}
                    </button>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600 text-[9px] font-bold">
                        <Num value={items.length} /> {(dict as any).Dashboard?.Item || "Item"}
                    </Badge>
                </div>

                <div className="flex flex-col p-2 gap-2">
                    {items.map((item) => (
                        <div key={item.id} className="p-2 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all group relative animate-in fade-in slide-in-from-right-2 duration-300">
                            {/* Row 1: Name & Unit Price */}
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-[12px] text-slate-900 line-clamp-2 w-[65%] leading-tight text-start">{item.name}</h4>
                                <div className="text-right">
                                    <div className="font-black text-blue-600 text-[14px]">
                                        <Num value={item.price * item.qty} precision={2} showGrouping={true} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: Controls & Details */}
                            <div className="flex justify-between items-center">
                                <div className="text-[9px] text-slate-400 font-bold flex flex-col">
                                    <span>
                                        <Num value={item.qty} /> × <Num value={item.price} precision={2} />
                                    </span>
                                </div>

                                {/* Qty Controls */}
                                <div className="flex items-center bg-slate-50 rounded-full p-0.5 gap-1.5 border border-slate-100">
                                    <button
                                        type="button"
                                        title={dict.Common.Increase || "Increase"}
                                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-blue-600 rounded-full shadow-sm text-blue-600 hover:text-white transition-all transform active:scale-90 border border-slate-100"
                                        onClick={() => updateItem(item.id, { qty: item.qty + 1 })}
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <span className="font-black text-[12px] w-5 text-center text-slate-800">
                                        <Num value={item.qty} />
                                    </span>
                                    <button
                                        type="button"
                                        title={dict.Common.Decrease || "Decrease"}
                                        className="w-7 h-7 flex items-center justify-center bg-white hover:bg-red-500 rounded-full shadow-sm text-slate-600 hover:text-white transition-all transform active:scale-90 border border-slate-100"
                                        onClick={() => updateItem(item.id, { qty: Math.max(1, item.qty - 1) })}
                                    >
                                        <Minus size={14} />
                                    </button>
                                </div>

                                {/* Quick Delete */}
                                <button
                                    type="button"
                                    title={dict.Common.Delete || "Delete"}
                                    className="w-7 h-7 flex items-center justify-center text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                                    onClick={() => removeFromCart(item.id)}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}

                    {items.length === 0 && (
                        <div className="h-32 flex flex-col items-center justify-center text-slate-300 gap-2 grayscale">
                            <ShoppingCart size={32} />
                            <span className="text-xs font-bold">{dict?.POS?.EmptyCart || "Cart is empty"}</span>
                        </div>
                    )}
                </div>

                {/* The Floating Footer - Part of the flow */}
                <div className="mt-4 pb-4">
                    <POSFooter />
                </div>
            </div>
        </div>
    );
}
