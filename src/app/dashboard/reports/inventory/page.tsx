import { getInventoryReport } from "@/features/reports/actions";
import { Package, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { getDictionary } from "@/lib/i18n-server";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { getSettings } from "@/features/settings/actions";

export default async function InventoryReportPage() {
    const data = await getInventoryReport();
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const { dict, lang } = (await getDictionary()) as any;
    if (!data) return <div className="p-8 text-center">{dict?.Common?.Loading || "Loading..."}</div>;

    const reportTitle = dict?.Reports?.InventoryReport?.Title || "تقرير المخزون";

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500" dir="rtl">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                        <Package className="h-6 w-6" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-800 tracking-tight">
                        {reportTitle}
                    </h1>
                </div>
                <div className="text-[10px] font-bold text-slate-400 bg-white border px-3 py-1 rounded-full shadow-sm">
                    {new Date().toLocaleDateString(lang === 'ar' ? 'ar-EG' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <div className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 h-1 bg-slate-100 w-full"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:scale-110 transition-transform">
                            <Package className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{dict.Reports.InventoryReport.Subtitles.Goods}</span>
                    </div>
                    <div className="text-3xl font-black text-slate-900">{formatNumber(data.totalItems)}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{dict.Reports.InventoryReport.TotalItems}</div>
                </div>

                <div className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 h-1 bg-blue-100 w-full"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">{dict.Reports.InventoryReport.Subtitles.Capital}</span>
                    </div>
                    <div className="text-3xl font-black text-blue-700 dir-ltr text-right">{formatCurrency(data.totalCostValue, currency)}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{dict.Reports.InventoryReport.TotalCost}</div>
                </div>

                <div className="group relative overflow-hidden bg-white p-6 rounded-3xl border border-slate-100 shadow-sm transition-all hover:shadow-md">
                    <div className="absolute top-0 right-0 h-1 bg-emerald-100 w-full"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">{dict.Reports.InventoryReport.Subtitles.PotentialRevenue}</span>
                    </div>
                    <div className="text-3xl font-black text-emerald-700 dir-ltr text-right">{formatCurrency(data.totalSalesValue, currency)}</div>
                    <div className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">{dict.Reports.InventoryReport.TotalSales}</div>
                </div>

                <div className="group relative overflow-hidden bg-slate-900 p-6 rounded-3xl shadow-xl shadow-slate-100 transition-all hover:-translate-y-1">
                    <div className="absolute top-0 right-0 h-1 bg-indigo-500 w-full opacity-50"></div>
                    <div className="flex items-center justify-between mb-4">
                        <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <DollarSign className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-300 opacity-50 uppercase tracking-widest">{dict.Reports.InventoryReport.Subtitles.ProfitMargin}</span>
                    </div>
                    <div className="text-3xl font-black text-white dir-ltr text-right">{formatCurrency(data.potentialProfit, currency)}</div>
                    <div className="text-[11px] font-bold text-indigo-200/50 mt-1 uppercase tracking-tighter">{dict.Reports.InventoryReport.Profit}</div>
                </div>
            </div>

            {/* Low Stock Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="bg-rose-50/50 border-b border-rose-100/50 p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                            <AlertTriangle className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900">{dict.Reports.InventoryReport.LowStock}</h2>
                            <p className="text-xs font-bold text-rose-600 tracking-tight">نواقص المخزون التي تتطلب توريد فوري</p>
                        </div>
                    </div>
                    <div className="px-4 py-1.5 bg-rose-100 rounded-full text-rose-700 text-xs font-black">
                        {data.lowStockItems.length} صنف متبقي
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="px-6 py-4 text-start text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.InventoryReport.Table.ProductName}</th>
                                <th className="px-6 py-4 text-start text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.InventoryReport.Table.SKU}</th>
                                <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.InventoryReport.Table.CurrentStock}</th>
                                <th className="px-6 py-4 text-end text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.InventoryReport.Table.BuyPrice}</th>
                                <th className="px-6 py-4 text-end text-[10px] font-black text-slate-400 uppercase tracking-widest">{dict.Reports.InventoryReport.Table.Action}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {data.lowStockItems.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center gap-3 opacity-20">
                                            <Package size={48} />
                                            <p className="text-sm font-black text-slate-500">{dict.Reports.InventoryReport.Table.NoLowStock}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                data.lowStockItems.map(item => (
                                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-black text-slate-700 group-hover:text-blue-600 transition-colors">{item.name}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{item.sku}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black shadow-sm ${Number(item.stockQuantity) === 0 ? 'bg-rose-500 text-white shadow-rose-200' : 'bg-amber-400 text-white shadow-amber-100'
                                                }`}>
                                                {item.stockQuantity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-end font-black text-slate-900 dir-ltr">{formatCurrency(Number(item.buyPrice), currency)}</td>
                                        <td className="px-6 py-4 text-end">
                                            <Link
                                                href={`/dashboard/purchases/create?productId=${item.id}`}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-black transition-all"
                                            >
                                                <TrendingUp size={14} />
                                                {dict.Reports.InventoryReport.Table.OrderSupply}
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
