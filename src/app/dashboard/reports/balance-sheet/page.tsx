import { getBalanceSheetData } from "@/features/reports/actions";
import { Landmark, TrendingUp, ShieldCheck, PieChart, Wallet, Scale, AlertTriangle, CheckCircle2 } from "lucide-react";
import { getDictionary } from "@/lib/i18n-server";
import { formatCurrency } from "@/lib/utils";
import { getSettings } from "@/features/settings/actions";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

export default async function BalanceSheetPage() {
    const data = await getBalanceSheetData();
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = (await getDictionary()) as any;

    if (!data || !data.success) return <div className="p-8 text-center">{dict?.Common?.Loading}</div>;

    const report = data.data;
    const t = dict.Reports.BalanceSheet;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6" dir="rtl">
            <ReportsBackButton />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl shadow-slate-200">
                        <Landmark className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            {t.Title}
                        </h1>
                        <p className="text-slate-500 font-bold text-lg">{t.Description}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                    {report.isBalanced ? (
                        <div className="flex items-center gap-2 px-6 py-3 bg-emerald-50 text-emerald-700 rounded-xl">
                            <CheckCircle2 className="h-6 w-6" />
                            <span className="font-black text-base">{t.EquationBalanced}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 px-6 py-3 bg-rose-50 text-rose-700 rounded-xl">
                            <AlertTriangle className="h-6 w-6" />
                            <span className="font-black text-base">{t.EquationUnbalanced}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Sections Grid */}
            <div className="grid gap-8 grid-cols-1 lg:grid-cols-2">

                {/* Assets Column */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                            <TrendingUp className="text-emerald-500" />
                            {t.Assets}
                        </h2>
                        <span className="text-sm font-bold text-slate-400 uppercase tracking-tighter">Current Values</span>
                    </div>

                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-2">
                            {report.assets.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between p-5 hover:bg-slate-50 transition-colors rounded-2xl">
                                    <div className="font-black text-slate-700">{item.name}</div>
                                    <div className="font-black text-slate-900 text-lg dir-ltr">{formatCurrency(item.value, currency)}</div>
                                </div>
                            ))}
                            {report.assets.length === 0 && (
                                <div className="p-10 text-center text-slate-400 font-medium italic">No assets recorded</div>
                            )}
                        </div>
                        <div className="bg-slate-900 text-white p-8 mt-2">
                            <div className="flex items-center justify-between">
                                <div className="text-xl font-black opacity-80 uppercase tracking-widest">{t.TotalAssets}</div>
                                <div className="text-3xl font-black dir-ltr underline decoration-emerald-500 decoration-4 underline-offset-8">
                                    {formatCurrency(report.totalAssets, currency)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liabilities & Equity Column */}
                <div className="space-y-8">
                    {/* Liabilities Section */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 px-2">
                            <Wallet className="text-rose-500" />
                            {t.Liabilities}
                        </h2>
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden">
                            <div className="p-2">
                                {report.liabilities.map((item: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors rounded-xl">
                                        <div className="font-black text-slate-600">{item.name}</div>
                                        <div className="font-black text-slate-900 dir-ltr">{formatCurrency(item.value, currency)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Equity Section */}
                    <div className="space-y-4">
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 px-2">
                            <PieChart className="text-blue-500" />
                            {t.Equity}
                        </h2>
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-lg shadow-slate-100/50 overflow-hidden">
                            <div className="p-2">
                                {report.equity.map((item: any, idx: number) => (
                                    <div key={idx} className={`flex items-center justify-between p-4 transition-colors rounded-xl ${item.isGenerated ? 'bg-indigo-50/50 text-indigo-700 border border-indigo-100' : 'hover:bg-slate-50'}`}>
                                        <div className="font-black">{item.name}</div>
                                        <div className={`font-black dir-ltr ${item.value < 0 ? 'text-rose-600' : 'text-blue-700'}`}>
                                            {formatCurrency(item.value, currency)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Grand Total L+E */}
                    <div className="bg-blue-600 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-blue-200">
                        <div className="flex items-center justify-between">
                            <div className="text-xl font-black opacity-80 uppercase tracking-widest">{t.TotalLiabilitiesAndEquity}</div>
                            <div className="text-3xl font-black dir-ltr underline decoration-white/30 decoration-4 underline-offset-8">
                                {formatCurrency(report.totalLiabilities + report.totalEquity, currency)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Smart Summary Card */}
            <div className={`p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 border ${report.isBalanced ? 'bg-emerald-50 border-emerald-100 text-emerald-900' : 'bg-rose-50 border-rose-100 text-rose-900'
                }`}>
                <div className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${report.isBalanced ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-rose-500 text-white shadow-rose-200'
                    }`}>
                    <ShieldCheck className="h-10 w-10" />
                </div>
                <div>
                    <h3 className="text-2xl font-black mb-1">
                        {report.isBalanced ? t.EquationBalanced : t.EquationUnbalanced}
                    </h3>
                    <p className="font-bold opacity-80 italic">
                        {report.isBalanced
                            ? "جميع السجلات المالية متوافقة مع معادلة الميزانية (الأصول = الالتزامات + حقوق الملكية)."
                            : "يرجى مراجعة قيود اليومية أو أرصدة الحسابات حيث يوجد خلل في توازن المركز المالي."}
                    </p>
                </div>
            </div>
        </div>
    );
}
