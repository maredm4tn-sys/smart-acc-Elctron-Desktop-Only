"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ShoppingCart,
    Package,
    Users,
    TrendingUp,
    DollarSign,
    FileText,
    Activity,
    Plus,
    Truck,
    CreditCard,
    Search,
    AlertTriangle,
    Wallet,
    ShoppingBag,
    Calendar,
    Settings,
    FileSearch,
    Receipt,
    Calculator,
    RefreshCw
} from "lucide-react";
import Link from "next/link";
import { useTranslation } from "@/components/providers/i18n-provider";
import { formatCurrency } from "@/lib/utils";
import { formatNumber, NumeralSystem } from "@/lib/numbers";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Num } from "@/components/ui/num";

export default function DashboardView({ data, lang, settings }: { data: any, lang: string, settings: any }) {
    const { dict } = useTranslation() as any;
    const [stats, setStats] = useState<any>(data?.data || {});
    const [isOffline, setIsOffline] = useState(false);

    useEffect(() => {
        setIsOffline(!window.navigator.onLine);
        const handleOffline = () => setIsOffline(true);
        const handleOnline = () => setIsOffline(false);
        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);
        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, []);

    const localeForDate = lang === 'ar' ? 'ar-EG' : 'en-GB';

    const isAr = lang === 'ar';

    return (
        <div className="space-y-4 animate-in fade-in duration-500 pb-10" dir={isAr ? "rtl" : "ltr"}>
            {/* 0. MINI SYSTEM BAR */}
            <div className={`flex items-center justify-between px-1 ${!isAr ? 'flex-row-reverse' : ''}`}>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100/50 px-2 py-0.5 rounded-full border border-slate-200/50">
                        <div className={`h-1.5 w-1.5 rounded-full ${isOffline ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">
                            {isOffline ? dict.Common.Offline.Status : dict.Dashboard.SystemOnline}
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 rounded-full hover:bg-slate-100/50 text-slate-400 group"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="h-3.5 w-3.5 group-active:rotate-180 transition-transform duration-500" />
                    </Button>
                </div>
            </div>

            {data?.error && (
                <div className="bg-red-50 border border-red-200 p-2 rounded-xl flex items-center gap-2 text-red-700 text-[11px] font-bold animate-pulse">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{dict.Dashboard.SyncWarning}</span>
                    </div>
                </div>
            )}

            {/* 1. ULTRA-COMPACT QUICK ACTIONS GRID (9 COLUMNS with Double Rows) */}
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-9 gap-2 pt-1">
                {/* Sales Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/sales" color="emerald" title={dict.Sidebar.SalesAndInvoices} icon={<ShoppingCart className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/sales/create" color="emerald" title={dict.Dashboard.NewInvoice} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/inventory" color="indigo" title={dict.Sidebar.Inventory} icon={<Package className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/inventory/create" color="indigo" title={dict.Dashboard.AddProduct} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Customers Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/customers" color="purple" title={dict.Sidebar.Customers} icon={<Users className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/customers/create" color="purple" title={dict.Dashboard.AddCustomer} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Purchases Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/purchases" color="blue" title={dict.Sidebar.Purchases} icon={<ShoppingBag className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/purchases/create" color="blue" title={dict.Dashboard.NewPurchase} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Suppliers Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/suppliers" color="cyan" title={dict.Sidebar.Suppliers} icon={<Truck className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/suppliers/create" color="cyan" title={dict.Dashboard.AddSupplier} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Journal Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/journal" color="orange" title={dict.Sidebar.JournalEntries} icon={<FileText className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/journal/new" color="orange" title={dict.Dashboard.NewJournalEntry} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Vouchers Column (Receipt) */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/vouchers" color="rose" title={dict.Sidebar.Vouchers} icon={<Receipt className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/vouchers/create?type=receipt" color="rose" title={dict.Dashboard.NewReceipt} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Expenses & Payment Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/expenses" color="amber" title={dict.Dashboard.DailyExpenses} icon={<Wallet className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/vouchers/create?type=payment" color="amber" title={dict.Dashboard.PaymentVoucher} icon={<Plus className="h-3.5 w-3.5" />} isAction />
                </div>

                {/* Reports Column */}
                <div className="flex flex-col gap-1.5">
                    <QuickActionSquare href="/dashboard/reports" color="slate" title={dict.Sidebar.Reports} icon={<Activity className="h-4 w-4" />} />
                    <QuickActionSquare href="/dashboard/reports/statement" color="slate" title={dict.Dashboard.AccountStatement} icon={<Search className="h-3.5 w-3.5" />} isAction />
                </div>
            </div>

            {/* 2. STATS GRID (NOW IMMEDIATELY BELOW) - 8 Cards for total coverage */}
            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 pt-1">
                <CardWrapper icon={<DollarSign className="h-3.5 w-3.5" />} color="blue" title={dict.Dashboard.TotalRevenue} value={<Num value={stats.totalRevenue || 0} showGrouping={true} />} suffix={settings?.currency || "EGP"} />
                <CardWrapper icon={<Wallet className="h-3.5 w-3.5" />} color="emerald" title={dict.Dashboard.CashLiquidity} value={<Num value={stats.cashLiquidity || 0} showGrouping={true} />} suffix={settings?.currency || "EGP"} />
                <CardWrapper icon={<Package className="h-3.5 w-3.5" />} color="orange" title={dict.Dashboard.InventoryValue} value={<Num value={stats.inventoryValue || 0} showGrouping={true} />} suffix={settings?.currency || "EGP"} />
                <CardWrapper icon={<Users className="h-3.5 w-3.5" />} color="purple" title={dict.Dashboard.CustomerReceivables} value={<Num value={stats.totalReceivables || 0} showGrouping={true} />} suffix={settings?.currency || "EGP"} />
            </div>

            <div className="grid gap-2 grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
                <CardWrapper icon={<ShoppingBag className="h-3.5 w-3.5" />} color="purple" title={dict.Dashboard.AvgBasket} value={<Num value={stats.avgBasket || 0} showGrouping={true} />} suffix={settings?.currency || "EGP"} />
                <CardWrapper icon={<CreditCard className="h-3.5 w-3.5" />} color="blue" title={dict.Dashboard.SalesInvoices} value={<Num value={stats.invoicesCount || 0} />} suffix={dict.Dashboard.Invoice} />
                <CardWrapper icon={<Package className="h-3.5 w-3.5" />} color="orange" title={dict.Dashboard.ActiveProducts} value={<Num value={stats.activeProducts || 0} />} suffix={dict.Dashboard.Item} />
                <CardWrapper icon={<Activity className="h-3.5 w-3.5" />} color="emerald" title={dict.Dashboard.FinancialAccounts} value={<Num value={stats.totalAccounts || 0} />} suffix={dict.Dashboard.Account} />
            </div>

            {/* 3. ALERTS & TRENDS (BOTTOM) */}
            <div className="grid gap-3 md:grid-cols-12 mt-1">
                {/* Top Selling Products */}
                <div className="md:col-span-7">
                    <Card className="border-none shadow-sm bg-white overflow-hidden rounded-2xl">
                        <CardHeader className="border-b border-gray-50 bg-slate-50/10 py-1 px-3">
                            <CardTitle className="flex items-center gap-2 text-[10px] font-black text-slate-800 uppercase tracking-tight">
                                <TrendingUp className="h-3 w-3 text-emerald-500" />
                                {dict.Dashboard.TopSelling}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="divide-y divide-slate-50">
                                {stats.topProducts && stats.topProducts.length > 0 ? (
                                    stats.topProducts.slice(0, 5).map((p: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between py-1.5 px-3 hover:bg-slate-50/50 transition-colors">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-200">#{idx + 1}</span>
                                                <span className="font-bold text-slate-700 text-[10px] truncate max-w-[180px]">{p.name}</span>
                                            </div>
                                            <span className="font-black text-slate-900 text-[10px]"><Num value={p.sold} /></span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-slate-400 text-[9px] italic">
                                        {dict.Dashboard.NoSalesData}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* System Alerts */}
                <div className="md:col-span-5">
                    <Card className="border-none shadow-sm bg-white overflow-hidden h-full rounded-2xl">
                        <CardHeader className="border-b border-gray-50 bg-slate-50/10 py-1 px-3">
                            <CardTitle className="flex items-center gap-2 text-[10px] font-black text-slate-900 uppercase tracking-tight">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                                {dict.Dashboard.SystemAlerts}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 space-y-1">
                            {/* Inventory Alerts */}
                            {stats.lowStockItems?.length > 0 && (
                                <div className="flex items-center justify-between p-1 rounded-lg bg-red-50/50 border border-red-100/30">
                                    <div className="flex items-center gap-1.5">
                                        <Package size={10} className="text-red-500" />
                                        <span className="text-[9px] font-bold text-slate-700 underline">{dict.Dashboard.LowStock}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-red-600"><Num value={stats.lowStockItems.length} /> {dict.Dashboard.Item}</span>
                                </div>
                            )}

                            {/* Customer Debt Alerts */}
                            {stats.overdueInvoices?.length > 0 && (
                                <div className="flex items-center justify-between p-1 rounded-lg bg-amber-50/50 border border-amber-100/30">
                                    <div className="flex items-center gap-1.5">
                                        <Users size={10} className="text-amber-600" />
                                        <span className="text-[9px] font-bold text-slate-700">{dict.Dashboard.CustomerReceivables}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-amber-700"><Num value={stats.overdueInvoices.length} /> {dict.Dashboard.Invoice}</span>
                                </div>
                            )}

                            {/* Supplier Debt Alerts */}
                            {stats.duePurchases?.length > 0 && (
                                <div className="flex items-center justify-between p-1 rounded-lg bg-blue-50/50 border border-blue-100/30">
                                    <div className="flex items-center gap-1.5">
                                        <Truck size={10} className="text-blue-600" />
                                        <span className="text-[9px] font-bold text-slate-700">{dict.Dashboard.SupplierPayables}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-blue-700"><Num value={stats.duePurchases.length} /> {dict.Dashboard.Invoice}</span>
                                </div>
                            )}

                            {/* Installment Alerts */}
                            {stats.upcomingInstallmentsTotal > 0 && (
                                <div className="flex items-center justify-between p-1 rounded-lg bg-emerald-50/50 border border-emerald-100/30">
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={10} className="text-emerald-600" />
                                        <span className="text-[9px] font-bold text-slate-700">{dict.Dashboard.UpcomingInstallments}</span>
                                    </div>
                                    <span className="text-[9px] font-black text-emerald-700"><Num value={stats.upcomingInstallmentsTotal} precision={2} showGrouping={true} /> {settings?.currency || "EGP"}</span>
                                </div>
                            )}

                            {!stats.lowStockItems?.length && !stats.overdueInvoices?.length && !stats.duePurchases?.length && stats.upcomingInstallmentsTotal === 0 && (
                                <div className="text-[9px] text-center text-slate-300 py-6 border border-dashed rounded-lg">
                                    {dict.Dashboard.NoActiveAlerts}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}


// --- SUB-COMPONENT: QUICK ACTION SQUARE ---
function QuickActionSquare({ icon, title, href, color, isPlaceholder, isAction }: { icon: React.ReactNode, title: string, href?: string, color: string, isPlaceholder?: boolean, isAction?: boolean }) {
    const colorMap: Record<string, string> = {
        emerald: 'from-emerald-500 to-emerald-600 border-emerald-400/20 shadow-emerald-500/20',
        blue: 'from-blue-500 to-blue-600 border-blue-400/20 shadow-blue-500/20',
        indigo: 'from-indigo-500 to-indigo-600 border-indigo-400/20 shadow-indigo-500/20',
        purple: 'from-purple-500 to-purple-600 border-purple-400/20 shadow-purple-500/20',
        orange: 'from-orange-500 to-orange-600 border-orange-400/20 shadow-orange-500/20',
        rose: 'from-rose-500 to-rose-600 border-rose-400/20 shadow-rose-500/20',
        amber: 'from-amber-500 to-amber-600 border-amber-400/20 shadow-amber-500/20',
        slate: 'from-slate-600 to-slate-700 border-slate-500/20 shadow-slate-500/20',
        cyan: 'from-cyan-500 to-cyan-600 border-cyan-400/20 shadow-cyan-500/20',
        gray: 'from-slate-50 to-slate-100 border border-slate-100 text-slate-300 shadow-none',
    };

    const gradient = colorMap[color] || colorMap.blue;
    const height = isAction ? 'h-[55px]' : 'h-[75px]';
    const fontSize = isAction ? 'text-[12px]' : 'text-[14px]';

    return (
        <Link href={href || "#"} className={`${isPlaceholder ? 'pointer-events-none' : ''} block w-full`}>
            <div className={`group relative flex flex-col items-center justify-center p-1 rounded-2xl transition-all duration-300 ${height} text-center gap-1 overflow-hidden border
                           ${isPlaceholder ? 'cursor-default opacity-40 bg-slate-100' : 'hover:brightness-110 active:scale-95 cursor-pointer shadow-md hover:shadow-xl hover:-translate-y-1'}
                           bg-gradient-to-br ${gradient} ${!isPlaceholder && 'text-white'}`}>
                <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className={`transition-transform duration-500 ${!isPlaceholder && 'group-hover:scale-110 group-hover:rotate-3'}`}>
                    {icon}
                </div>
                <span className={`${fontSize} font-black leading-tight w-full px-0.5 break-words tracking-tighter`}>
                    {title}
                </span>
                {isAction && !isPlaceholder && (
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/20"></div>
                )}
            </div>
        </Link>
    );
}

// --- HELPER: STAT CARD ---
interface CardWrapperProps {
    icon: React.ReactNode;
    color: 'blue' | 'purple' | 'orange' | 'emerald';
    title: string;
    value: string | number | React.ReactNode;
    suffix?: string;
    pill?: string;
}

function CardWrapper({ icon, color, title, value, suffix, pill }: CardWrapperProps) {
    const bgColors: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-600',
        purple: 'bg-purple-500/10 text-purple-600',
        orange: 'bg-orange-500/10 text-orange-600',
        emerald: 'bg-emerald-500/10 text-emerald-600'
    };

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-100 p-3 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between relative z-10">
                <div className={`h-7 w-7 rounded-xl ${bgColors[color]} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    {icon}
                </div>
                {pill && (
                    <span className="text-[8px] font-black text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-full uppercase tracking-tighter">
                        {pill}
                    </span>
                )}
            </div>
            <div className="mt-2 flex items-baseline gap-1 relative z-10">
                <span className="text-xl font-black tracking-tighter text-slate-900 leading-none">{value}</span>
                <span className="text-[9px] font-bold text-slate-400">{suffix}</span>
            </div>
            <div className="mt-1 text-[10px] font-black text-slate-400 truncate uppercase tracking-tighter relative z-10">
                {title}
            </div>
            <div className={`absolute -bottom-2 -right-2 h-12 w-12 rounded-full opacity-5 ${bgColors[color].split(' ')[0]}`}></div>
        </div>
    );
}
