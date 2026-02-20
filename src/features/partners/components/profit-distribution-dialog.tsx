"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TrendingUp, Loader2, Calculator, CheckCircle2, ChevronRight, AlertCircle } from "lucide-react";
import { getProfitDistributionPreview, processProfitDistribution } from "../actions";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";

import { TranslationKeys } from "@/lib/translation-types";

export function ProfitDistributionDialog({ dict, onSuccess }: { dict: TranslationKeys; onSuccess: () => void }) {
    const { currency } = useSettings();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [preview, setPreview] = useState<any>(null);
    const [period, setPeriod] = useState({
        from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        to: new Date().toISOString().split('T')[0]
    });

    const handlePreview = async () => {
        setLoading(true);
        try {
            const res = await getProfitDistributionPreview(period);
            if (res.success) {
                setPreview(res.data);
            } else {
                toast.error(res.message || dict.PartnersManagement.Transaction.Error);
            }
        } catch (err) {
            toast.error(dict.PartnersManagement.Transaction.Error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcess = async () => {
        if (!preview) return;
        setProcessing(true);
        try {
            const res = await processProfitDistribution({
                period,
                distributions: preview.partners
            });
            if (res.success) {
                toast.success(dict.Common.Success);
                setOpen(false);
                onSuccess();
            } else {
                toast.error(res.message || dict.PartnersManagement?.Distribution?.Process);
            }
        } catch (err) {
            toast.error(dict.PartnersManagement?.Distribution?.Process);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 h-11 px-8 font-black rounded-2xl shadow-lg shadow-emerald-100">
                    <TrendingUp size={18} />
                    {dict.PartnersManagement.Distribution.Title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[850px] p-6 rounded-3xl border-none shadow-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-3xl font-black text-slate-900 border-b pb-4 flex items-center justify-between">
                        <span>{dict.PartnersManagement.Distribution.Title}</span>
                        {!preview && <Calculator className="text-emerald-600 w-8 h-8" />}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-6">
                    {/* Period Selection */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                        <div className="space-y-2">
                            <Label className="font-black text-slate-600">{dict.Common.From}</Label>
                            <Input
                                type="date"
                                value={period.from}
                                onChange={(e) => setPeriod(p => ({ ...p, from: e.target.value }))}
                                className="rounded-xl h-11 border-slate-200 font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-black text-slate-600">{dict.Common.To}</Label>
                            <Input
                                type="date"
                                value={period.to}
                                onChange={(e) => setPeriod(p => ({ ...p, to: e.target.value }))}
                                className="rounded-xl h-11 border-slate-200 font-bold"
                            />
                        </div>
                        <div className="md:col-span-2 pt-2">
                            <Button
                                onClick={handlePreview}
                                disabled={loading}
                                className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black rounded-xl text-lg gap-3"
                            >
                                {loading && <Loader2 className="animate-spin" />}
                                {dict.PartnersManagement.Distribution.Preview}
                            </Button>
                        </div>
                    </div>

                    {preview && (
                        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                            {/* Distribution Summary */}
                            <div className="bg-emerald-950 text-emerald-50 p-8 rounded-3xl relative overflow-hidden shadow-xl">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                                <h3 className="text-sm font-black uppercase tracking-[0.2em] opacity-60 mb-2">{dict.PartnersManagement.Distribution.NetProfit}</h3>
                                <div className="text-5xl font-black tracking-tighter mb-4">
                                    {formatCurrency(preview.netProfit, currency)}
                                </div>
                                <div className="flex items-center gap-2 text-emerald-300 font-bold bg-emerald-900/50 w-fit px-4 py-2 rounded-full border border-emerald-800">
                                    <CheckCircle2 size={16} />
                                    {dict.PartnersManagement.Distribution.DistributionHint}
                                </div>
                            </div>

                            {/* Details Table */}
                            <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="font-black text-slate-900">{dict.PartnersManagement.Table.Name}</TableHead>
                                            <TableHead className="font-black text-slate-900 text-center">{dict.PartnersManagement.Table.Share}</TableHead>
                                            <TableHead className="font-black text-slate-900 text-right">{dict.PartnersManagement.Table.TableProfitShare}</TableHead>
                                            <TableHead className="font-black text-slate-900 text-right">{dict.PartnersManagement.Table.Withdrawals}</TableHead>
                                            <TableHead className="font-black text-slate-900 text-right">{dict.PartnersManagement.Table.NetDue}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {preview.partners.map((p: any) => (
                                            <TableRow key={p.partnerId} className="hover:bg-slate-50 transition-colors">
                                                <TableCell className="font-bold text-slate-900">{p.name}</TableCell>
                                                <TableCell className="text-center">
                                                    <span className="bg-slate-100 px-2 py-0.5 rounded-full text-[10px] font-black">{p.percentage}%</span>
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">{formatCurrency(p.initialShare, currency)}</TableCell>
                                                <TableCell className="text-right font-bold text-rose-500">{formatCurrency(p.withdrawals, currency)}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className={`font-black text-lg ${p.finalDue >= 0 ? 'text-blue-700' : 'text-rose-700'}`}>
                                                        {formatCurrency(p.finalDue, currency)}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4 items-start shadow-sm">
                                <AlertCircle className="text-amber-600 shrink-0 mt-1" size={20} />
                                <div className="text-sm">
                                    <p className="font-black text-amber-900 italic mb-1">{dict.Common.Note}</p>
                                    <p className="text-amber-700 font-bold">
                                        {dict.PartnersManagement.Distribution.ProcessWarning}
                                    </p>
                                </div>
                            </div>

                            <div className="flex justify-between items-center pt-4 border-t">
                                <Button variant="ghost" onClick={() => setPreview(null)} className="font-black text-slate-400 gap-2">
                                    <ChevronRight size={18} /> {dict.PartnersManagement.Distribution.ChangePeriod}
                                </Button>
                                <Button
                                    onClick={handleProcess}
                                    disabled={processing}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black h-14 px-12 rounded-2xl text-xl shadow-xl shadow-emerald-100"
                                >
                                    {processing ? <Loader2 className="animate-spin" /> : dict.PartnersManagement?.Distribution?.Process}
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
