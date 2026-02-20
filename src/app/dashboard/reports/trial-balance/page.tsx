import { getTrialBalanceData } from "@/features/reports/actions";
import { Scale, ArrowDownLeft, ArrowUpRight, CheckCircle2, AlertCircle } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";
import { formatCurrency } from "@/lib/utils";
import { getSettings } from "@/features/settings/actions";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

export default async function TrialBalancePage() {
    const data = await getTrialBalanceData();
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = (await getDictionary()) as any;

    if (!data || !data.success) return <div className="p-8 text-center">{dict?.Common?.Loading}</div>;

    const report = data.data;
    const t = dict.Reports.TrialBalance;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6" dir="rtl">
            <ReportsBackButton />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-200">
                        <Scale className="h-7 w-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                            {t.Title}
                        </h1>
                        <p className="text-slate-500 font-medium text-sm">{t.Description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border shadow-sm">
                    {report.isBalanced ? (
                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl">
                            <CheckCircle2 className="h-5 w-5" />
                            <span className="font-black text-sm">{t.Balanced}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-700 rounded-xl">
                            <AlertCircle className="h-5 w-5" />
                            <span className="font-black text-sm">{t.Unbalanced.replace('{diff}', formatCurrency(Math.abs(report.totalDebit - report.totalCredit), currency))}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Totals Cards */}
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                <div className="relative overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-200">
                    <div className="absolute top-0 right-0 h-2 bg-blue-500 w-full opacity-20"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <ArrowDownLeft className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black text-blue-400 uppercase tracking-widest">{t.Table.Debit}</span>
                    </div>
                    <div className="text-4xl font-black text-slate-900 dir-ltr text-right">{formatCurrency(report.totalDebit, currency)}</div>
                </div>

                <div className="relative overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 transition-all hover:shadow-2xl hover:shadow-slate-200">
                    <div className="absolute top-0 right-0 h-2 bg-amber-500 w-full opacity-20"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                            <ArrowUpRight className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-black text-amber-400 uppercase tracking-widest">{t.Table.Credit}</span>
                    </div>
                    <div className="text-4xl font-black text-slate-900 dir-ltr text-right">{formatCurrency(report.totalCredit, currency)}</div>
                </div>
            </div>

            {/* Trial Balance Table */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.Table.AccountCode}</th>
                                <th className="px-8 py-5 text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.Table.AccountName}</th>
                                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.Table.Debit}</th>
                                <th className="px-8 py-5 text-center text-[11px] font-black text-slate-400 uppercase tracking-widest">{t.Table.Credit}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {report.rows.map((row: any) => (
                                <tr key={row.code} className="group hover:bg-slate-50/80 transition-all duration-200">
                                    <td className="px-8 py-5">
                                        <span className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${row.code.length <= 2 ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-500'
                                            }`}>
                                            {row.code}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className={`font-black tracking-tight ${row.code.length <= 2 ? 'text-slate-900 text-base' : 'text-slate-600 text-sm'
                                            }`}>
                                            {row.name}
                                        </div>
                                    </td>
                                    <td className={`px-8 py-5 text-center font-bold dir-ltr ${row.balanceDebit > 0 ? 'text-blue-600 bg-blue-50/30' : 'text-slate-300'}`}>
                                        {row.balanceDebit > 0 ? formatCurrency(row.balanceDebit, currency) : '-'}
                                    </td>
                                    <td className={`px-8 py-5 text-center font-bold dir-ltr ${row.balanceCredit > 0 ? 'text-amber-600 bg-amber-50/30' : 'text-slate-300'}`}>
                                        {row.balanceCredit > 0 ? formatCurrency(row.balanceCredit, currency) : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-slate-900 text-white">
                                <td colSpan={2} className="px-8 py-6 text-xl font-black">{t.Table.Total}</td>
                                <td className="px-8 py-6 text-center text-xl font-black dir-ltr border-x border-white/10">{formatCurrency(report.totalDebit, currency)}</td>
                                <td className="px-8 py-6 text-center text-xl font-black dir-ltr">{formatCurrency(report.totalCredit, currency)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
