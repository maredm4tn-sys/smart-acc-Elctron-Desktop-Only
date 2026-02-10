"use client";

import { useState, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText, Calendar, Hash, Tag, Info } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface Props {
    entry: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dict: any;
    currency: string;
}

export function JournalEntryDetailsDialog({ entry, open, onOpenChange, dict, currency }: Props) {
    const printRef = useRef<HTMLDivElement>(null);

    if (!entry) return null;

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html dir="${dict.Common?.Direction || 'rtl'}">
                <head>
                    <title>${entry.entryNumber}</title>
                    <style>
                        body { font-family: sans-serif; padding: 40px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th, td { border: 1px solid #ddd; padding: 12px; text-align: start; }
                        th { background-color: #f8f9fa; }
                        .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #eee; pb: 20px; }
                        .title { font-size: 24px; font-weight: bold; }
                        .meta { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                        .meta-item { display: flex; gap: 8px; font-size: 14px; }
                        .meta-label { font-weight: bold; color: #666; }
                        .totals { margin-top: 20px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
                        .total-row { display: flex; gap: 40px; font-weight: bold; border-top: 1px solid #eee; pt: 8px; }
                        @media print {
                            .no-print { display: none; }
                        }
                    </style>
                </head>
                <body>
                    <div class="header">
                        <div class="title">${dict.Journal.Title} - ${entry.entryNumber}</div>
                        <div>${new Date().toLocaleDateString()}</div>
                    </div>
                    <div class="meta">
                        <div class="meta-item"><span class="meta-label">${dict.Journal.Table.Date}:</span> ${new Date(entry.transactionDate).toLocaleDateString()}</div>
                        <div class="meta-item"><span class="meta-label">${dict.Journal.Table.Type}:</span> ${entry.type}</div>
                        <div class="meta-item"><span class="meta-label">${dict.Journal.Table.Reference || 'Reference'}:</span> ${entry.reference || '-'}</div>
                        <div class="meta-item"><span class="meta-label">${dict.Journal.Table.Status}:</span> ${entry.status}</div>
                    </div>
                    <div style="margin-bottom: 20px;">
                        <span class="meta-label">${dict.Journal.Table.Description || 'Description'}:</span>
                        <p style="margin-top: 5px;">${entry.description || '-'}</p>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>${dict.Journal.Table.Account}</th>
                                <th>${dict.Journal.Table.Description || 'Description'}</th>
                                <th style="text-align: end">${dict.Journal.Table.Debit}</th>
                                <th style="text-align: end">${dict.Journal.Table.Credit}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entry.lines.map((line: any) => `
                                <tr>
                                    <td>${line.account.name} (${line.account.code})</td>
                                    <td>${line.description || '-'}</td>
                                    <td style="text-align: end">${formatCurrency(Number(line.debit), currency)}</td>
                                    <td style="text-align: end">${formatCurrency(Number(line.credit), currency)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <div class="totals">
                        <div class="total-row">
                            <span>${dict.Journal.Table.Debit}: ${formatCurrency(entry.debitTotal, currency)}</span>
                            <span>${dict.Journal.Table.Credit}: ${formatCurrency(entry.creditTotal, currency)}</span>
                        </div>
                    </div>
                </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-600" />
                            <span>{dict.Journal.Table.EntryNumber}: {entry.entryNumber}</span>
                        </div>
                        <Badge variant={entry.status === 'posted' ? 'default' : 'secondary'} className={entry.status === 'posted' ? 'bg-emerald-600' : ''}>
                            {entry.status === 'posted' ? dict.Journal.Table.Posted : entry.status}
                        </Badge>
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4" ref={printRef}>
                    {/* Header Info Grid */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <Calendar className="h-3 w-3" />
                                {dict.Journal.Table.Date}
                            </div>
                            <div className="font-bold text-sm">{new Date(entry.transactionDate).toLocaleDateString()}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <Tag className="h-3 w-3" />
                                {dict.Journal.Table.Type}
                            </div>
                            <div className="font-bold text-sm">
                                <Badge variant="outline" className="text-[10px] py-0">
                                    {entry.type === 'Invoice' ? dict.Journal.Types.Invoice :
                                        entry.type === 'Payment' ? dict.Journal.Types.Payment :
                                            dict.Journal.Types.Manual}
                                </Badge>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <Hash className="h-3 w-3" />
                                {dict.Journal.Table.Reference || 'المرجع'}
                            </div>
                            <div className="font-bold text-sm font-mono text-blue-600">{entry.reference || '-'}</div>
                        </div>
                        <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                                <Info className="h-3 w-3" />
                                {dict.Journal.Table.Currency || 'العملة'}
                            </div>
                            <div className="font-bold text-sm">{entry.currency || currency}</div>
                        </div>
                    </div>

                    {entry.description && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 italic text-slate-600 text-sm">
                            <span className="font-black not-italic text-slate-400 text-[10px] block uppercase mb-1">{dict.Journal.Table.Description || 'البيان'}</span>
                            {entry.description}
                        </div>
                    )}

                    <div className="rounded-md border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-start px-4 py-2 font-black text-slate-600 text-[10px] uppercase">{dict.Journal.Table.Account}</th>
                                    <th className="text-start px-4 py-2 font-black text-slate-600 text-[10px] uppercase">{dict.Journal.Table.Description || 'البيان'}</th>
                                    <th className="text-end px-4 py-2 font-black text-slate-600 text-[10px] uppercase">{dict.Journal.Table.Debit}</th>
                                    <th className="text-end px-4 py-2 font-black text-slate-600 text-[10px] uppercase">{dict.Journal.Table.Credit}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {entry.lines.map((line: any) => (
                                    <tr key={line.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-slate-900">{line.account.name}</div>
                                            <div className="text-[10px] font-mono text-slate-400">{line.account.code}</div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500 italic max-w-[200px] truncate" title={line.description}>{line.description || '-'}</td>
                                        <td className="px-4 py-3 text-end font-mono font-bold text-emerald-600">
                                            {Number(line.debit) > 0 ? formatCurrency(Number(line.debit), currency) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-end font-mono font-bold text-rose-600">
                                            {Number(line.credit) > 0 ? formatCurrency(Number(line.credit), currency) : '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-4">
                        <div className="bg-slate-900 text-white rounded-xl p-4 min-w-[300px] shadow-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] font-black uppercase opacity-60">{dict.Journal.Table.DebitTotal || 'إجمالي المدين'}</span>
                                <span className="font-mono font-bold">{formatCurrency(entry.debitTotal, currency)}</span>
                            </div>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black uppercase opacity-60">{dict.Journal.Table.CreditTotal || 'إجمالي الدائن'}</span>
                                <span className="font-mono font-bold">{formatCurrency(entry.creditTotal, currency)}</span>
                            </div>
                            <Separator className="bg-white/20 mb-3" />
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-black uppercase">{dict.Journal.Table.Balance || 'التوازن'}</span>
                                <Badge variant="outline" className="bg-emerald-500/20 text-emerald-400 border-none">
                                    Balanced
                                </Badge>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                        {dict.Common?.Close || 'إغلاق'}
                    </Button>
                    <Button onClick={handlePrint} className="gap-2 rounded-xl bg-slate-900 hover:bg-slate-800">
                        <Printer size={16} />
                        {dict.Journal?.Print || 'طباعة القيد'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
