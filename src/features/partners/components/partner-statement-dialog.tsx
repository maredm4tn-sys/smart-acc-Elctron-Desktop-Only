"use client";

import { useState, useEffect, useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Printer, ArrowUpRight, ArrowDownRight, Package, Calculator } from "lucide-react";
import { getPartnerStatement } from "../actions";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";

import { TranslationKeys } from "@/lib/translation-types";

export function PartnerStatementDialog({ partner, dict }: { partner: any; dict: TranslationKeys }) {
    const { currency } = useSettings();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [transactions, setTransactions] = useState<any[]>([]);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        content: () => printRef.current,
        documentTitle: `${dict.PartnersManagement?.Statement?.Title} - ${partner.name}`,
    });

    useEffect(() => {
        if (open) {
            setLoading(true);
            getPartnerStatement(partner.id).then(res => {
                if (res.success) setTransactions(res.data);
                setLoading(false);
            });
        }
    }, [open, partner.id]);

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'capital_increase': return { label: dict.PartnersManagement?.Transaction?.CapitalIncrease, color: 'text-blue-600', icon: <ArrowUpRight size={14} /> };
            case 'withdrawal_cash': return { label: dict.PartnersManagement?.Transaction?.WithdrawalCash, color: 'text-rose-600', icon: <ArrowDownRight size={14} /> };
            case 'withdrawal_goods': return { label: dict.PartnersManagement?.Transaction?.WithdrawalGoods, color: 'text-orange-600', icon: <Package size={14} /> };
            case 'profit_share': return { label: dict.PartnersManagement?.ProfitShare, color: 'text-emerald-600', icon: <Calculator size={14} /> };
            default: return { label: type, color: 'text-slate-600', icon: null };
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title={dict.PartnersManagement?.Statement?.Title}>
                    <FileText className="w-4 h-4 text-slate-400" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] p-0 rounded-3xl overflow-hidden border-none shadow-2xl">
                <div ref={printRef} className="flex flex-col h-full bg-white print:p-8">
                    <div className="bg-slate-900 p-8 text-white no-print">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-3xl font-black">{dict.PartnersManagement?.Statement?.Title}</h2>
                                <p className="text-slate-400 font-bold mt-1 uppercase tracking-widest">{partner.name}</p>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    className="bg-white/10 border-white/20 hover:bg-white/20 text-white rounded-xl"
                                    onClick={() => handlePrint()}
                                >
                                    <Printer size={18} />
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-6 mt-8">
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black opacity-50 uppercase mb-1">{dict.PartnersManagement?.CurrentCapital}</p>
                                <p className="text-xl font-black">{formatCurrency(parseFloat(partner.currentCapital), currency)}</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black opacity-50 uppercase mb-1">{dict.PartnersManagement?.CurrentShare}</p>
                                <p className="text-xl font-black text-blue-400">{partner.sharePercentage}%</p>
                            </div>
                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black opacity-50 uppercase mb-1">{dict.PartnersManagement?.CurrentBalance}</p>
                                <p className={`text-xl font-black ${parseFloat(partner.currentBalance) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {formatCurrency(Math.abs(parseFloat(partner.currentBalance)), currency)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Print Header (Visible only when printing) */}
                    <div className="hidden print:block border-b-2 border-slate-900 mb-8 pb-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <h1 className="text-3xl font-black text-slate-900">{dict.PartnersManagement?.Statement?.Title}</h1>
                                <p className="text-xl font-bold text-blue-700">{partner.name}</p>
                                <p className="text-slate-400 text-xs mt-1">{dict.Common?.Date}: {new Date().toLocaleDateString('en-GB')}</p>
                            </div>
                            <div className="text-left" dir="ltr">
                                <h2 className="text-2xl font-black tracking-tighter">Smart Accountant</h2>
                                <p className="text-[10px] text-slate-400 uppercase font-black">Partner Financial Statement</p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto bg-white flex-1">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-slate-100">
                                    <TableHead className="text-start font-black text-slate-400 uppercase text-[10px]">{dict.PartnersManagement?.Transaction?.Date}</TableHead>
                                    <TableHead className="text-center font-black text-slate-400 uppercase text-[10px]">{dict.PartnersManagement?.Transaction?.Type}</TableHead>
                                    <TableHead className="text-start font-black text-slate-400 uppercase text-[10px]">{dict.PartnersManagement?.Transaction?.DescriptionLabel}</TableHead>
                                    <TableHead className="text-end font-black text-slate-400 uppercase text-[10px]">{dict.PartnersManagement?.Transaction?.TransAmount}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => {
                                    const info = getTypeLabel(tx.type);
                                    return (
                                        <TableRow key={tx.id} className="hover:bg-slate-50/50 border-slate-50 transition-colors">
                                            <TableCell className="text-start font-bold text-slate-500 text-xs">{tx.date}</TableCell>
                                            <TableCell className="text-center">
                                                <div className={`inline-flex items-center gap-2 font-black text-[11px] px-2 py-0.5 rounded-full ${info.color} bg-slate-50`}>
                                                    {info.icon}
                                                    {info.label}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-start text-slate-600 font-bold text-xs">
                                                {tx.description === "Opening Capital Deposit" ? dict.PartnersManagement?.Transaction?.Types?.OpeningDeposit : (tx.description || "-")}
                                            </TableCell>
                                            <TableCell className={`text-end font-black tabular-nums ${info.color}`}>
                                                {tx.type.includes('withdrawal') ? '-' : '+'}
                                                {formatCurrency(parseFloat(tx.amount), currency)}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="bg-slate-50 p-4 border-t flex justify-end no-print">
                        <Button variant="ghost" onClick={() => setOpen(false)} className="font-black text-slate-400 hover:text-slate-600 transition-colors">{dict.Common.Close}</Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
