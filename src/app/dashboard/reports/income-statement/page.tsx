
"use client";

import { useState, useTransition, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getIncomeStatementData, getProfitExport } from "@/features/reports/actions";
import { getSession } from "@/features/auth/actions";
import { ExcelExportButton } from "@/components/common/excel-export-button";
import { Loader2, TrendingDown, TrendingUp, Calendar as CalendarIcon, FileText } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";

export default function IncomeStatementPage() {
    const { dict, lang } = useTranslation();
    const { currency } = useSettings();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        getSession().then(s => {
            if (s?.role === 'admin' || s?.role === 'SUPER_ADMIN') setIsAdmin(true);
        });
        // Run initial report on mount
        handleApplyFilter({ period: 'month' });
    }, []);

    const [fromDate, setFromDate] = useState<string>("");
    const [toDate, setToDate] = useState<string>("");
    const [activePeriod, setActivePeriod] = useState<string>("month");

    // Interface for detail items
    interface DetailItem {
        date: string;
        createdAt?: string | null;
        entryNumber: any;
        name: string;
        accountName: string;
        value: number;
    }

    const [data, setData] = useState<any>(null);
    const [isPending, startTransition] = useTransition();

    const handleApplyFilter = (filters: any) => {
        startTransition(async () => {
            try {
                const res = await getIncomeStatementData(filters);
                if (res.success) {
                    setData(res.data);
                    if (filters.fromDate) setFromDate(filters.fromDate);
                    if (filters.toDate) setToDate(filters.toDate);
                    if (filters.period) setActivePeriod(filters.period);
                    else setActivePeriod("custom");
                } else {
                    console.error("Report Error:", res.message);
                }
            } catch (error) {
                console.error("Failed to fetch report", error);
            }
        });
    };

    const handleQuickPeriod = (period: string) => {
        setFromDate("");
        setToDate("");
        handleApplyFilter({ period });
    };

    const getTimeFromItem = (item: DetailItem) => {
        if (item.createdAt) return new Date(item.createdAt);
        return null;
    };

    // Simplified local formatter using the global utility
    const formatLocalizedCurrency = (value: number) => {
        return formatCurrency(value, currency);
    };

    return (
        <div className="space-y-8" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className={lang === 'ar' ? 'text-right' : 'text-left'}>
                    <h2 className="text-3xl font-black tracking-tight text-slate-800">{dict.Reports.IncomeStatement.Title}</h2>
                    <p className="text-slate-500 mt-1 font-bold">{dict.Reports.IncomeStatement.Subtitle}</p>
                </div>
                {isAdmin && (
                    <ExcelExportButton
                        getData={getProfitExport}
                        fileName="Profit_Report"
                        label={dict.Reports.IncomeStatement.ExportComprehensive}
                    />
                )}
            </div>

            {/* Filter Section */}
            <Card className="border-none shadow-md bg-white p-4">
                <div className="space-y-4">
                    {/* Row 1: Custom Date Range */}
                    <div className="flex flex-col sm:flex-row items-end gap-3 pb-4 border-b">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {dict.Reports.IncomeStatement.FromDate}
                            </label>
                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                                title={dict.Reports.IncomeStatement.FromDate}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {dict.Reports.IncomeStatement.ToDate}
                            </label>
                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                                title={dict.Reports.IncomeStatement.ToDate}
                                className="w-full h-10 px-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 font-bold"
                            />
                        </div>
                        <Button
                            onClick={() => handleApplyFilter({ fromDate, toDate })}
                            disabled={isPending || !fromDate || !toDate}
                            className="h-10 bg-slate-900 hover:bg-black text-white font-bold px-6"
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : dict.Reports.IncomeStatement.ShowReport}
                        </Button>
                    </div>

                    {/* Row 2: Quick Periods */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-xs font-bold text-gray-400 mx-2">{dict.Reports.IncomeStatement.QuickPeriod}:</span>
                        <Button
                            variant={activePeriod === "day" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleQuickPeriod("day")}
                            className="rounded-full h-8 text-xs font-black px-4"
                        >
                            {dict.Reports.IncomeStatement.TodayReport}
                        </Button>
                        <Button
                            variant={activePeriod === "week" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleQuickPeriod("week")}
                            className="rounded-full h-8 text-xs font-black px-4"
                        >
                            {dict.Reports.IncomeStatement.WeekReport}
                        </Button>
                        <Button
                            variant={activePeriod === "month" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleQuickPeriod("month")}
                            className="rounded-full h-8 text-xs font-black px-4"
                        >
                            {dict.Reports.IncomeStatement.MonthReport}
                        </Button>
                        <Button
                            variant={activePeriod === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleQuickPeriod("all")}
                            className="rounded-full h-8 text-xs font-black px-4"
                        >
                            {dict.Reports.IncomeStatement.FiscalYear}
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Report Content */}
            {data ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
                    {/* Summary Cards */}
                    <div className="grid gap-6 md:grid-cols-3">
                        <Card className="border-none shadow-md bg-white border-x-4 border-x-emerald-500">
                            <CardContent className="p-6">
                                <div className="text-sm font-bold text-gray-500 mb-1">{dict.Reports.IncomeStatement.TotalRevenue}</div>
                                <div className="text-2xl font-black text-emerald-600 flex justify-between items-center">
                                    <div className="dir-ltr">{formatLocalizedCurrency(data.totalRevenue)}</div>
                                    <TrendingUp className="h-6 w-6 opacity-30" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border-none shadow-md bg-white border-x-4 border-x-red-500">
                            <CardContent className="p-6">
                                <div className="text-sm font-bold text-gray-500 mb-1">{dict.Reports.IncomeStatement.TotalExpenses}</div>
                                <div className="text-2xl font-black text-red-600 flex justify-between items-center">
                                    <div className="dir-ltr">{formatLocalizedCurrency(data.totalExpenses)}</div>
                                    <TrendingDown className="h-6 w-6 opacity-30" />
                                </div>
                            </CardContent>
                        </Card>
                        <Card className={cn(
                            "border-none shadow-xl border-x-4",
                            data.netProfit >= 0 ? "bg-slate-900 text-white border-x-blue-400" : "bg-red-900 text-white border-x-red-400"
                        )}>
                            <CardContent className="p-6">
                                <div className="text-sm font-bold text-blue-100 mb-1">{dict.Reports.IncomeStatement.NetProfit}</div>
                                <div className="text-3xl font-black flex justify-between items-center">
                                    <div className="dir-ltr">{formatLocalizedCurrency(data.netProfit)}</div>
                                    {data.netProfit >= 0 ? <TrendingUp className="h-7 w-7 opacity-20" /> : <TrendingDown className="h-7 w-7 opacity-20" />}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Detailed Sections (Vertical) */}
                    {/* 1. Revenue Details */}
                    <Card className="border-none shadow-lg bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-emerald-50/50 border-b border-gray-100 pb-4 px-6">
                            <CardTitle className="text-lg font-black text-emerald-800 flex items-center gap-2">
                                <TrendingUp className="h-5 w-5" />
                                {dict.Reports.IncomeStatement.RevenueDetails}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rt-table-container">
                                <table className="rt-table w-full">
                                    <thead>
                                        <tr className="bg-emerald-50/30">
                                            <th className="w-[150px] text-center px-6 py-4 font-black">{dict.Reports.IncomeStatement.Table.Date}</th>
                                            <th className="text-start px-4 py-4 font-black">{dict.Reports.IncomeStatement.Table.Item}</th>
                                            <th className="text-start px-4 py-4 font-black">{dict.Reports.IncomeStatement.Table.Category}</th>
                                            <th className="text-end px-6 py-4 font-black w-[180px]">{dict.Reports.IncomeStatement.Table.Value}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.revenueDetails && data.revenueDetails.length > 0 ? (
                                            data.revenueDetails.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-emerald-50/20 transition-colors">
                                                    <td className="text-center px-6 py-4">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-sm">{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                                                            {(() => {
                                                                const time = getTimeFromItem(item);
                                                                return time ? (
                                                                    <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 rounded mt-1 dir-ltr">
                                                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="text-start px-4 py-4 font-bold text-slate-800">{item.name}</td>
                                                    <td className="text-start px-4 py-4 text-xs font-bold text-slate-400">{item.accountName}</td>
                                                    <td className="text-end px-6 py-4 font-black text-emerald-700 dir-ltr text-lg">
                                                        {formatLocalizedCurrency(item.value)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={4} className="text-center py-16 text-slate-400 font-black text-lg">{dict.Reports.IncomeStatement.Table.NoRevenues}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* 2. Expense Details */}
                    <Card className="border-none shadow-lg bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="bg-red-50/50 border-b border-gray-100 pb-4 px-6">
                            <CardTitle className="text-lg font-black text-red-800 flex items-center gap-2">
                                <FileText className="h-5 w-5" />
                                {dict.Reports.IncomeStatement.ExpenseDetails}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rt-table-container">
                                <table className="rt-table w-full">
                                    <thead>
                                        <tr className="bg-red-50/30">
                                            <th className="w-[150px] text-center px-6 py-4 font-black">{dict.Reports.IncomeStatement.Table.Date}</th>
                                            <th className="text-start px-4 py-4 font-black">{dict.Reports.IncomeStatement.Table.Item}</th>
                                            <th className="text-start px-4 py-4 font-black">{dict.Reports.IncomeStatement.Table.Category}</th>
                                            <th className="text-end px-6 py-4 font-black w-[180px]">{dict.Reports.IncomeStatement.Table.Value}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {data.expenseDetails && data.expenseDetails.length > 0 ? (
                                            data.expenseDetails.map((item: any, idx: number) => (
                                                <tr key={idx} className="hover:bg-red-50/20 transition-colors">
                                                    <td className="text-center px-6 py-4">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-bold text-sm">{new Date(item.date).toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB')}</span>
                                                            {(() => {
                                                                const time = getTimeFromItem(item);
                                                                return time ? (
                                                                    <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1.5 rounded mt-1 dir-ltr">
                                                                        {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })}
                                                                    </span>
                                                                ) : null;
                                                            })()}
                                                        </div>
                                                    </td>
                                                    <td className="text-start px-4 py-4 font-bold text-slate-800">{item.name}</td>
                                                    <td className="text-start px-4 py-4 text-xs font-bold text-slate-400">{item.accountName}</td>
                                                    <td className="text-end px-6 py-4 font-black text-red-700 dir-ltr text-lg">
                                                        {formatLocalizedCurrency(item.value)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr><td colSpan={4} className="text-center py-16 text-slate-400 font-black text-lg">{dict.Reports.IncomeStatement.Table.NoExpenses}</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-80 bg-white rounded-3xl border-2 border-dashed border-slate-200">
                    <Loader2 className="h-10 w-10 text-slate-300 animate-spin" />
                    <p className="mt-4 text-slate-500 font-black">{dict.Common.Loading}</p>
                </div>
            )}
        </div>
    );
}
