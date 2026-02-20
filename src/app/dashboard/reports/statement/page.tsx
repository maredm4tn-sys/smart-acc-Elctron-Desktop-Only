
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCustomerStatement, getAccountStatement, StatementEntry } from "@/features/reports/statement-actions";
import { Loader2, Printer, Search, Activity, Calendar, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";
import { ReportsBackButton } from "@/components/dashboard/reports-back-button";

// Simple Internal Entity Select Component
function EntitySelect({ type, value, onChange }: { type: string, value: number | null, onChange: (val: number) => void }) {
    const { dict } = useTranslation() as any;
    const [list, setList] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            try {
                let url = "";
                if (type === 'customer') url = "/api/customers";
                else if (type === 'supplier') url = "/api/suppliers";
                else if (type === 'treasury') url = "/api/accounts?type=asset";
                else if (type === 'expense') url = "/api/accounts?type=expense";
                else url = `/api/accounts?type=${type}`;

                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setList(data.success ? data.data : (Array.isArray(data) ? data : []));
                } else {
                    setList([]);
                }
            } catch (e) {
                setList([]);
            } finally {
                setLoading(false);
            }
        };
        fetchList();
    }, [type]);

    const filteredList = list.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Select value={value?.toString()} onValueChange={(v) => onChange(Number(v))}>
            <SelectTrigger className="w-full bg-white/50 backdrop-blur-sm border-slate-200 focus:ring-blue-500 transition-all">
                <SelectValue placeholder={loading ? dict?.Reports?.GeneralStatement?.Loading : dict?.Reports?.GeneralStatement?.SelectPlaceholder} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
                <div className="p-2 border-b">
                    <Input
                        placeholder={dict.Common?.SearchPlaceholder || "Search..."}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-8 text-xs"
                    />
                </div>
                {filteredList.length > 0 ? (
                    filteredList.map((item) => (
                        <SelectItem key={item.id} value={item.id.toString()}>
                            {item.name}
                        </SelectItem>
                    ))
                ) : (
                    <div className="p-4 text-sm text-gray-400 text-center italic">
                        {loading ? (dict.Common?.Loading || "Loading...") : (dict?.Reports?.GeneralStatement?.NoData)}
                    </div>
                )}
            </SelectContent>
        </Select>
    );
}

export default function StatementPage() {
    const { dict, lang } = useTranslation() as any;
    const [type, setType] = useState<string>('customer');
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const today = new Date();
    const currentYear = today.getFullYear();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const [startDate, setStartDate] = useState<string>(`${currentYear}-01-01`);
    const [endDate, setEndDate] = useState<string>(lastDayOfMonth.toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ statement: StatementEntry[], entity: any, openingBalance: number, closingBalance: number, installments?: any[] } | null>(null);

    const handlePrint = () => {
        if (!selectedId) return;
        const url = `/print/statements?type=${type}&id=${selectedId}&start=${startDate}&end=${endDate}`;
        window.open(url, '_blank');
    };

    const handleSearch = async () => {
        if (!selectedId) {
            toast.error(dict?.Reports?.GeneralStatement?.Errors?.SelectAccount);
            return;
        }
        setLoading(true);
        try {
            let result;
            if (type === 'customer' || type === 'supplier') {
                result = await getCustomerStatement(type as any, selectedId, new Date(startDate), new Date(endDate));
            } else {
                result = await getAccountStatement(selectedId, new Date(startDate), new Date(endDate));
            }
            setData(result);
        } catch (e: any) {
            console.error(e);
            toast.error((dict?.Reports?.GeneralStatement?.Errors?.FetchFailed) + ": " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-blue-600" /></div>}>
            <StatementContent
                type={type}
                setType={setType}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                startDate={startDate}
                setStartDate={setStartDate}
                endDate={endDate}
                setEndDate={setEndDate}
                loading={loading}
                data={data}
                setData={setData}
                handleSearch={handleSearch}
                handlePrint={handlePrint}
                printRef={null}
            />
        </Suspense>
    );
}

function StatementContent({
    type, setType, selectedId, setSelectedId, startDate, setStartDate, endDate, setEndDate,
    loading, data, setData, handleSearch, handlePrint, printRef
}: any) {
    const { dict, lang } = useTranslation() as any;
    const { currency } = useSettings();
    const searchParams = useSearchParams();

    useEffect(() => {
        const searchVal = searchParams.get('search');
        if (searchVal) {
            if (searchVal === 'customers') setType('customer');
            else if (searchVal === 'suppliers') setType('supplier');
            else if (searchVal === 'cash' || searchVal === 'banks') setType('treasury');
            else if (searchVal === 'expenses') setType('expense');
            setSelectedId(null);
            setData(null);
        }
    }, [searchParams, setType, setSelectedId, setData]);

    const getReportTitle = () => {
        const titles = dict?.Reports?.GeneralStatement?.ReportTitles;
        if (!titles) return "كشف حساب";
        switch (type) {
            case 'customer': return titles.Customer;
            case 'supplier': return titles.Supplier;
            case 'treasury': return titles.Treasury;
            case 'expense': return titles.Expense;
            default: return titles.General;
        }
    };

    return (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6" dir="rtl">
            <ReportsBackButton />
            {/* Header / Options Bar - Ultra Compact */}
            <div className="bg-white/80 backdrop-blur-md border border-slate-200 rounded-xl p-3 shadow-sm sticky top-0 z-10">
                <div className="flex flex-col lg:flex-row items-center gap-3">
                    <div className="flex items-center gap-2 min-w-[200px]">
                        <Activity className="h-5 w-5 text-blue-600" />
                        <h1 className="text-xl font-black text-slate-800 tracking-tight whitespace-nowrap">
                            {dict?.Reports?.GeneralStatement?.Title}
                        </h1>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:flex lg:flex-1 gap-2 w-full">
                        <div className="lg:w-40">
                            <Select value={type} onValueChange={(v: string) => { setType(v); setSelectedId(null); setData(null); }}>
                                <SelectTrigger className="h-9 text-xs bg-slate-50/50">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="customer">{dict?.Reports?.GeneralStatement?.Types?.Customer}</SelectItem>
                                    <SelectItem value="supplier">{dict?.Reports?.GeneralStatement?.Types?.Supplier}</SelectItem>
                                    <SelectItem value="treasury">{dict?.Reports?.GeneralStatement?.Types?.Treasury}</SelectItem>
                                    <SelectItem value="expense">{dict?.Reports?.GeneralStatement?.Types?.Expense}</SelectItem>
                                    <SelectItem value="revenue">{dict?.Reports?.GeneralStatement?.Types?.Revenue}</SelectItem>
                                    <SelectItem value="equity">{dict?.Reports?.GeneralStatement?.Types?.Equity}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="lg:flex-1">
                            <EntitySelect type={type} value={selectedId} onChange={setSelectedId} />
                        </div>

                        <div className="flex items-center bg-slate-50 rounded-md border h-9 px-2 gap-2">
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{dict?.Reports?.GeneralStatement?.FromDate}</span>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 w-full"
                                aria-label={dict?.Reports?.GeneralStatement?.FromDate}
                            />
                        </div>

                        <div className="flex items-center bg-slate-50 rounded-md border h-9 px-2 gap-2">
                            <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">{dict?.Reports?.GeneralStatement?.ToDate}</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="bg-transparent border-none text-xs focus:ring-0 w-full"
                                aria-label={dict?.Reports?.GeneralStatement?.ToDate}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleSearch}
                            disabled={loading || !selectedId}
                            className="h-9 px-6 bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all font-bold"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 ml-1.5" />}
                            {dict?.Reports?.GeneralStatement?.ShowReport}
                        </Button>

                        {data && (
                            <Button variant="outline" onClick={handlePrint} className="h-9 px-4 border-slate-200 hover:bg-slate-50">
                                <Printer className="w-4 h-4 ml-1.5 text-slate-600" />
                                {dict?.Reports?.GeneralStatement?.Print}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Area */}
            {!data && !loading && (
                <div className="h-[400px] border-2 border-dashed border-slate-100 rounded-3xl flex flex-col items-center justify-center text-slate-300 gap-4">
                    <div className="p-6 bg-slate-50 rounded-full">
                        <Search size={40} className="opacity-20" />
                    </div>
                    <p className="text-sm font-medium">{dict.Reports?.GeneralStatement?.SelectAccount}</p>
                </div>
            )}

            {loading && (
                <div className="h-[400px] flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                        <div className="h-16 w-16 rounded-full border-4 border-slate-100 border-t-blue-600 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-blue-600/50 animate-pulse" />
                        </div>
                    </div>
                    <p className="text-sm font-bold text-slate-500 animate-pulse">{dict.Common?.Loading}</p>
                </div>
            )}

            {data && (
                <div className="space-y-4">
                    {/* Visual Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className="absolute top-0 right-0 h-2 bg-slate-100 w-full"></div>
                            <div className="flex items-center gap-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600">
                                    <Calendar className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.GeneralStatement.OpeningBalance}</p>
                                    <p className="text-2xl font-black text-slate-800 dir-ltr text-right">{formatCurrency(data.openingBalance, currency)}</p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                            <div className={`absolute top-0 right-0 h-2 w-full ${data.closingBalance - data.openingBalance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}></div>
                            <div className="flex items-center gap-4">
                                <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${data.closingBalance - data.openingBalance >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                    <TrendingUp className="h-6 w-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.GeneralStatement.PeriodMotion}</p>
                                    <p className={`text-2xl font-black dir-ltr text-right ${data.closingBalance - data.openingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {formatCurrency(data.closingBalance - data.openingBalance, currency)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="group relative overflow-hidden bg-blue-600 p-5 rounded-2xl shadow-xl shadow-blue-100 transition-all hover:-translate-y-1">
                            <div className="absolute top-0 right-0 h-2 bg-blue-500/50 w-full"></div>
                            <div className="flex items-center gap-4 text-white">
                                <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                                    <DollarSign className="h-6 w-6" />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-[10px] font-black text-blue-100 opacity-80 uppercase tracking-widest">{dict.Reports.GeneralStatement.ClosingBalance}</p>
                                    <p className="text-3xl font-black text-white dir-ltr">{formatCurrency(data.closingBalance, currency)}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Report Content for Display Table */}
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-slate-50/80 border-b border-slate-100">
                                        <th className="py-4 px-4 text-start font-black text-slate-500 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.Date}</th>
                                        <th className="py-4 px-4 text-start font-black text-amber-600 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.DueDate}</th>
                                        <th className="py-4 px-4 text-start font-black text-slate-500 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.Description}</th>
                                        <th className="py-4 px-4 text-start font-black text-slate-500 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.Reference}</th>
                                        <th className="py-4 px-4 text-end font-black text-slate-500 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.Debit}</th>
                                        <th className="py-4 px-4 text-end font-black text-slate-500 uppercase tracking-tighter text-[10px]">{dict?.Reports?.GeneralStatement?.Table?.Credit}</th>
                                        <th className="py-4 px-4 text-end font-black text-slate-500 uppercase tracking-tighter text-[10px] bg-slate-50">{dict?.Reports?.GeneralStatement?.Table?.Balance}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {data.statement.map((row: any, idx: number) => (
                                        <tr key={idx} className={`group transition-colors ${row.type === 'OPENING' ? 'bg-amber-50/30' : 'hover:bg-slate-50/50'}`}>
                                            <td className="py-3 px-4 text-xs font-semibold text-slate-400 whitespace-nowrap">
                                                {(() => {
                                                    const d = new Date(row.date);
                                                    return isNaN(d.getTime()) ? '---' : d.toLocaleDateString('en-GB');
                                                })()}
                                            </td>
                                            <td className="py-3 px-4 text-xs font-bold text-amber-600 whitespace-nowrap">
                                                {(() => {
                                                    if (!row.dueDate) return '-';
                                                    const d = new Date(row.dueDate);
                                                    return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('en-GB');
                                                })()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="font-bold text-slate-700">{row.description}</div>
                                                {row.type === 'OPENING' && <span className="text-[10px] text-amber-600 bg-amber-100/50 px-2 py-0.5 rounded-full font-bold">{dict.Reports?.GeneralStatement?.Table?.OpeningBalance}</span>}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-[10px] text-slate-400">{row.reference || '-'}</td>
                                            <td className="py-3 px-4 text-end font-black text-slate-900 dir-ltr">
                                                {row.debit > 0 ? (
                                                    <span className="text-emerald-600">{formatNumber(row.debit)}</span>
                                                ) : '-'}
                                            </td>
                                            <td className="py-3 px-4 text-end font-black text-slate-900 dir-ltr">
                                                {row.credit > 0 ? (
                                                    <span className="text-rose-600">{formatNumber(row.credit)}</span>
                                                ) : '-'}
                                            </td>
                                            <td className={`py-3 px-4 text-end font-black dir-ltr bg-slate-50/30 group-hover:bg-slate-100/50 transition-colors ${row.balance < 0 ? 'text-rose-700' : 'text-blue-700'}`}>
                                                {formatNumber(row.balance)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Installments for View */}
                    {type === 'customer' && data.installments && data.installments.length > 0 && (
                        <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <CreditCard size={120} />
                            </div>
                            <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                                <span className="h-8 w-1 bg-blue-500 rounded-full"></span>
                                {dict.Installments?.Title}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {data.installments.map((inst: any, i: number) => (
                                    <div key={i} className={`p-4 rounded-2xl border ${inst.status === 'paid' ? 'bg-white/10 border-white/10' : 'bg-white/20 border-white/20 backdrop-blur-md'}`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-bold text-blue-200">{inst.dueDate}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${inst.status === 'paid' ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-slate-900'}`}>
                                                {inst.status === 'paid' ? dict.Installments?.Table?.Paid : dict.Installments?.Table?.Unpaid}
                                            </span>
                                        </div>
                                        <div className="text-xl font-black">{formatCurrency(inst.amount, currency)}</div>
                                        <div className="text-[9px] text-white/50 mt-1">{dict.Reports?.GeneralStatement?.Table?.Ref}: {inst.invoiceNumber}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
}

