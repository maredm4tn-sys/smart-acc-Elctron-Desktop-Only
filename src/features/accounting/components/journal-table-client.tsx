"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { JournalEntryDetailsDialog } from "./journal-entry-details-dialog";
import { Num } from "@/components/ui/num";
import { useSettings } from "@/components/providers/settings-provider";
import { formatNumber } from "@/lib/numbers";

interface Props {
    initialEntries: any[];
    dict: any;
    currency: string;
}

export function JournalTableClient({ initialEntries, dict, currency }: Props) {
    const [selectedEntry, setSelectedEntry] = useState<any>(null);
    const [dialogOpen, setDialogOpen] = useState(false);

    const handleEntryClick = (entry: any) => {
        setSelectedEntry(entry);
        setDialogOpen(true);
    };

    return (
        <>
            <div className="rt-table-container">
                <table className="rt-table">
                    <thead>
                        <tr>
                            <th className="text-start w-[140px] px-4">{dict.Journal.Table.EntryNumber}</th>
                            <th className="text-start w-[110px]">{dict.Journal.Table.Date}</th>
                            <th className="text-center w-[100px]">{dict.Journal.Table.Type}</th>
                            <th className="text-start">{dict.Journal.Table.Account}</th>
                            <th className="text-end w-[130px]">{dict.Journal.Table.Debit}</th>
                            <th className="text-end w-[130px]">{dict.Journal.Table.Credit}</th>
                            <th className="text-end w-[100px] pr-4">{dict.Journal.Table.Status}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {initialEntries.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="text-center py-12 text-gray-400 font-medium italic">
                                    {dict.Journal.Table.NoEntries}
                                </td>
                            </tr>
                        ) : (
                            initialEntries.map((entry: any) => (
                                <tr key={entry.id} className="group hover:bg-slate-50 transition-all duration-200">
                                    <td data-label={dict.Journal.Table.EntryNumber} className="text-start px-4">
                                        <button
                                            onClick={() => handleEntryClick(entry)}
                                            title={dict.Journal.ViewDetails || "View Details"}
                                            className="font-mono font-black text-[11px] text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-all active:scale-95"
                                        >
                                            <Num value={entry.entryNumber} />
                                        </button>
                                    </td>
                                    <td data-label={dict.Journal.Table.Date} className="text-start text-xs font-bold text-slate-500 tabular-nums">
                                        <Num value={new Date(entry.transactionDate).toLocaleDateString()} />
                                    </td>
                                    <td data-label={dict.Journal.Table.Type} className="text-center">
                                        <Badge variant="outline" className={cn(
                                            "text-[10px] font-black border-none px-2.5",
                                            entry.type === 'Invoice' ? 'bg-indigo-50 text-indigo-700' :
                                                entry.type === 'Payment' ? 'bg-emerald-50 text-emerald-700' :
                                                    'bg-slate-100 text-slate-700'
                                        )}>
                                            {entry.type === 'Invoice' ? dict.Journal.Types.Invoice :
                                                entry.type === 'Payment' ? dict.Journal.Types.Payment :
                                                    dict.Journal.Types.Manual}
                                        </Badge>
                                    </td>
                                    <td data-label={dict.Journal.Table.Account} className="text-start">
                                        <div className="font-bold text-sm text-slate-900 truncate max-w-[300px]" title={entry.accountsSummary}>
                                            {entry.accountsSummary}
                                        </div>
                                        {entry.description && (
                                            <div className="text-[10px] text-slate-400 font-medium truncate max-w-[250px] italic">
                                                {entry.description}
                                            </div>
                                        )}
                                    </td>
                                    <td data-label={dict.Journal.Table.Debit} className="text-end font-bold tabular-nums text-emerald-600 text-sm">
                                        {formatCurrency(entry.debitTotal, currency)}
                                    </td>
                                    <td data-label={dict.Journal.Table.Credit} className="text-end font-bold tabular-nums text-rose-600 text-sm">
                                        {formatCurrency(entry.creditTotal, currency)}
                                    </td>
                                    <td data-label={dict.Journal.Table.Status} className="text-end pr-4">
                                        <Badge
                                            variant={entry.status === 'posted' ? 'default' : 'secondary'}
                                            className={cn(
                                                "text-[10px] font-black shadow-none border-none",
                                                entry.status === 'posted' ? 'bg-emerald-600 hover:bg-emerald-700' : ''
                                            )}
                                        >
                                            {entry.status === 'posted' ? dict.Journal.Table.Posted : dict.Journal.Table.Draft}
                                        </Badge>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {selectedEntry && (
                <JournalEntryDetailsDialog
                    entry={selectedEntry}
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    dict={dict}
                    currency={currency}
                />
            )}
        </>
    );
}

// Helper function for cn
function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
