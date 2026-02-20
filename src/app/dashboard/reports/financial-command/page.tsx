"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Wallet, Box, AlertCircle, ArrowUpRight, ArrowDownRight, BarChart3, ShieldCheck } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { getFinancialCommandData } from "@/features/reports/actions";
import { toast } from "sonner";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

export default function FinancialCommandPage() {
    const { dict } = useTranslation() as any;
    const { currency } = useSettings();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await getFinancialCommandData();
            if (res.success) {
                setData(res.data);
            } else {
                throw new Error(res.message);
            }
        } catch (e: any) {
            console.error(e);
            toast.error(dict.Common?.Error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    if (loading) {
        return (
            <div className="h-[80vh] flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
            </div>
        );
    }

    if (!data) return null;

    const t = dict.Reports?.FinancialCommand || {};
    const isHealthy = data.netPosition > 0;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-6 max-w-7xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center">
                <ReportsBackButton />
                <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-black text-indigo-700 uppercase tracking-tighter">{t.SecuredZone || (dict.Common?.Direction === 'rtl' ? "منطقة استراتيجية مؤمنة" : "Secured Strategic Zone")}</span>
                </div>
            </div>

            <header className="space-y-2">
                <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                    <BarChart3 className="w-10 h-10 text-indigo-600" />
                    {t.Title}
                </h1>
                <p className="text-slate-500 font-bold text-lg max-w-2xl">
                    {t.Description}
                </p>
            </header>

            {/* Top Level Strategic Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className={cn(
                    "relative overflow-hidden border-none shadow-2xl transition-all duration-500",
                    isHealthy ? "bg-gradient-to-br from-indigo-600 to-blue-700 text-white" : "bg-gradient-to-br from-red-600 to-rose-700 text-white"
                )}>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-black uppercase tracking-widest opacity-80 flex items-center gap-2">
                            {t.NetPosition}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-5xl font-black tracking-tighter mb-2">
                            {formatCurrency(data.netPosition, currency)}
                        </div>
                        <div className="flex items-center gap-2 text-xs font-bold opacity-90">
                            {isHealthy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {isHealthy ? (t.StrongPosition) : (t.DeficitPosition)}
                        </div>
                    </CardContent>
                    <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                </Card>

                <Card className="bg-white border-slate-100 shadow-xl border-t-4 border-t-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
                            {t.TotalLiquidity}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-black text-slate-800 tracking-tighter">
                            {formatCurrency(data.liquidity.total, currency)}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{t.CashLiquidity}</p>
                                <p className="text-sm font-black text-slate-700">{formatCurrency(data.liquidity.cash, currency)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase">{t.InventoryValue}</p>
                                <p className="text-sm font-black text-slate-700">{formatCurrency(data.liquidity.inventory, currency)}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-100 shadow-xl border-t-4 border-t-indigo-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-slate-500 text-xs font-black uppercase tracking-widest flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-indigo-500" />
                            {t.LiquidityMeter}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {(() => {
                            const ratio = data.payables.total > 0 ? (data.liquidity.total / data.payables.total) : 10;
                            const percentage = Math.min(Math.round(ratio * 100), 100);
                            return (
                                <>
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden mt-2 relative">
                                        <div
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                ratio > 1.5 ? "bg-emerald-500" : ratio > 1 ? "bg-yellow-500" : "bg-red-500"
                                            )}
                                            style={{ width: `${percentage}%` }}
                                        ></div>
                                    </div>
                                    <div className="mt-4 flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">{t.CoverageRate}</p>
                                            <p className="text-2xl font-black text-slate-800 tracking-tighter">
                                                {data.payables.total === 0 ? "∞" : `${ratio.toFixed(1)}x`}
                                            </p>
                                        </div>
                                        <div className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                                            {data.payables.total === 0 ? (t.NoDebts) : ratio > 1 ? (t.LiquidityCoversDebts) : (t.DebtsExceedLiquidity)}
                                        </div>
                                    </div>
                                </>
                            )
                        })()}
                    </CardContent>
                </Card>
            </div>

            {/* Aged Debts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Receivables Aging */}
                <Card className="border-none shadow-xl bg-slate-50/50">
                    <CardHeader className="border-b bg-white rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-slate-800 font-black flex items-center gap-2">
                                    <ArrowUpRight className="w-5 h-5 text-emerald-600" />
                                    {t.Receivables}
                                </CardTitle>
                                <CardDescription className="font-bold">{t.DebtTimeline}</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{dict.Common?.All}</p>
                                <p className="text-xl font-black text-emerald-700 tracking-tighter">{formatCurrency(data.receivables.total, currency)}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <AgedItem title={t.AgedCurrent || "Current"} amount={data.receivables.current} color="emerald" percentage={(data.receivables.current / data.receivables.total) * 100} currency={currency} />
                        <AgedItem title={t.Aged1to30} amount={data.receivables.aged_1_30} color="orange" percentage={(data.receivables.aged_1_30 / data.receivables.total) * 100} currency={currency} />
                        <AgedItem title={t.Aged31Plus} amount={data.receivables.aged_31_plus} color="red" percentage={(data.receivables.aged_31_plus / data.receivables.total) * 100} currency={currency} />
                    </CardContent>
                </Card>

                {/* Payables Aging */}
                <Card className="border-none shadow-xl bg-slate-50/50">
                    <CardHeader className="border-b bg-white rounded-t-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-slate-800 font-black flex items-center gap-2">
                                    <ArrowDownRight className="w-5 h-5 text-rose-600" />
                                    {t.Payables}
                                </CardTitle>
                                <CardDescription className="font-bold">{t.DebtTimeline}</CardDescription>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-400 uppercase">{dict.Common?.All}</p>
                                <p className="text-xl font-black text-rose-700 tracking-tighter">{formatCurrency(data.payables.total, currency)}</p>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <AgedItem title={t.AgedCurrent || "Current"} amount={data.payables.current} color="slate" percentage={(data.payables.current / data.payables.total) * 100} currency={currency} />
                        <AgedItem title={t.Aged1to30} amount={data.payables.aged_1_30} color="orange" percentage={(data.payables.aged_1_30 / data.payables.total) * 100} currency={currency} />
                        <AgedItem title={t.Aged31Plus} amount={data.payables.aged_31_plus} color="red" percentage={(data.payables.aged_31_plus / data.payables.total) * 100} currency={currency} />
                    </CardContent>
                </Card>
            </div>

            {/* Strategic Alerts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
                <Card className="bg-indigo-900 text-white border-none shadow-2xl overflow-hidden relative group">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 font-black text-lg">
                            <ShieldCheck className="w-6 h-6 text-indigo-300" />
                            {t.StrategicSummary}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 relative z-10">
                        <div className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1 italic font-black shadow-inner">1</div>
                            <p className="font-bold leading-relaxed">
                                {(t.NetPositionSummary).replace('{amount}', formatCurrency(data.netPosition, currency))} <span className="text-indigo-200 underline underline-offset-8 font-black">{t.FormulaDesc}</span>.
                            </p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-6 w-6 rounded-full bg-white/10 flex items-center justify-center shrink-0 mt-1 italic font-black shadow-inner">2</div>
                            <p className="font-bold leading-relaxed">
                                {data.liquidity.total > data.payables.total
                                    ? (t.ExcellentPosition)
                                    : (t.CriticalPosition)
                                }
                            </p>
                        </div>
                    </CardContent>
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <BarChart3 className="w-32 h-32" />
                    </div>
                </Card>

                <div className="space-y-4">
                    <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5 text-indigo-600" />
                        {t.RecommendationTitle}
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {data.receivables.aged_31_plus > 0 && (
                            <AlertCard
                                title={t.UrgentCollection}
                                desc={(t.UrgentCollectionDesc).replace('{amount}', formatCurrency(data.receivables.aged_31_plus, currency))}
                                color="red"
                            />
                        )}
                        {data.liquidity.cash < data.payables.current && (
                            <AlertCard
                                title={t.CashShortage}
                                desc={t.CashShortageDesc}
                                color="orange"
                            />
                        )}
                        {isHealthy && (
                            <AlertCard
                                title={t.InvestmentOpportunity}
                                desc={t.InvestmentOpportunityDesc}
                                color="emerald"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AgedItem({ title, amount, percentage, color, currency }: { title: string, amount: number, percentage: number, color: string, currency: string }) {
    const safePercent = isNaN(percentage) ? 0 : Math.max(Math.min(percentage, 100), 0);
    const colorMap: Record<string, string> = {
        emerald: "bg-emerald-500",
        orange: "bg-orange-500",
        red: "bg-red-500",
        slate: "bg-slate-500",
        indigo: "bg-indigo-500"
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-end">
                <span className="text-xs font-black text-slate-600">{title}</span>
                <span className="text-sm font-black text-slate-900">{formatCurrency(amount, currency)}</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                    className={cn("h-full transition-all duration-1000", colorMap[color])}
                    style={{ width: `${safePercent}%` }}
                ></div>
            </div>
        </div>
    );
}

function AlertCard({ title, desc, color }: { title: string, desc: string, color: 'red' | 'orange' | 'emerald' }) {
    const styles = {
        red: "bg-red-50 border-red-100 text-red-800",
        orange: "bg-orange-50 border-orange-100 text-orange-800",
        emerald: "bg-emerald-50 border-emerald-100 text-emerald-800"
    };

    return (
        <div className={cn("p-4 rounded-xl border flex items-start gap-3 shadow-sm", styles[color])}>
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
                <p className="font-black text-sm uppercase leading-none mb-1">{title}</p>
                <p className="text-xs font-bold leading-relaxed opacity-90">{desc}</p>
            </div>
        </div>
    );
}
