"use client";

import { useEffect, useState } from "react";
import { getSmartAlerts, SmartAlert } from "@/features/alerts/actions";
import { AlertCircle, AlertTriangle, Info, ArrowLeft, CheckCircle2, ShoppingCart, Wallet, Database, Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/components/providers/i18n-provider";

export default function AlertsPage() {
    const { dict, dir } = useTranslation() as any;
    const [alerts, setAlerts] = useState<SmartAlert[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAlerts() {
            setLoading(true);
            const res = await getSmartAlerts();
            if (res.success && res.data) {
                setAlerts(res.data);
            }
            setLoading(false);
        }
        fetchAlerts();
    }, []);

    const getIcon = (type: string, severity: string) => {
        if (severity === 'high') return <AlertCircle className="text-red-500" size={24} />;
        if (severity === 'medium') return <AlertTriangle className="text-amber-500" size={24} />;
        return <Info className="text-blue-500" size={24} />;
    };

    const getCategoryIcon = (type: string) => {
        switch (type) {
            case 'accounting': return <CalculatorIcon size={16} className={dir === 'rtl' ? "ml-2" : "mr-2"} />;
            case 'inventory': return <ShoppingCart size={16} className={dir === 'rtl' ? "ml-2" : "mr-2"} />;
            case 'system': return <Database size={16} className={dir === 'rtl' ? "ml-2" : "mr-2"} />;
            case 'sales': return <Wallet size={16} className={dir === 'rtl' ? "ml-2" : "mr-2"} />;
            case 'finance': return <CalculatorIcon size={16} className={dir === 'rtl' ? "ml-2" : "mr-2"} />;
            default: return null;
        }
    };

    const t = (key: string, params?: Record<string, any>) => {
        if (!key) return "";
        const raw = key.split('.').reduce((acc, part) => acc && acc[part], dict);
        if (typeof raw !== 'string') return key;
        if (!params) return raw;

        let result = raw;
        Object.entries(params).forEach(([k, v]) => {
            result = result.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
        return result;
    };

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500" dir={dir}>
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <Bell className="text-blue-600" />
                        {dict.SmartAlerts.Title}
                    </h1>
                    <p className="text-slate-500">{dict.SmartAlerts.Description}</p>
                </div>
                <Link href="/dashboard">
                    <Button variant="outline" size="sm" className="gap-2">
                        <ArrowLeft size={16} className={dir === 'rtl' ? "" : "rotate-180"} />
                        {dict.SmartAlerts.BackHome}
                    </Button>
                </Link>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => (
                        <Card key={i} className="animate-pulse h-40 bg-slate-50"></Card>
                    ))}
                </div>
            ) : alerts.length === 0 ? (
                <Card className="border-dashed border-2 bg-slate-50 flex flex-col items-center justify-center p-12 text-center">
                    <CheckCircle2 size={48} className="text-green-500 mb-4" />
                    <CardTitle className="text-xl">{dict.SmartAlerts.AllSetTitle}</CardTitle>
                    <CardDescription className="max-w-md mt-2">
                        {dict.SmartAlerts.AllSetDesc}
                    </CardDescription>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {alerts.map((alert) => (
                        <Card key={alert.id} className={`${dir === 'rtl' ? "border-r-4" : "border-l-4"} ${alert.severity === 'high' ? (dir === 'rtl' ? 'border-r-red-500' : 'border-l-red-500') :
                            alert.severity === 'medium' ? (dir === 'rtl' ? 'border-r-amber-500' : 'border-l-amber-500') : (dir === 'rtl' ? 'border-r-blue-500' : 'border-l-blue-500')
                            } hover:shadow-md transition-shadow`}>
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <div className="p-2 bg-slate-50 rounded-lg">
                                        {getIcon(alert.type, alert.severity)}
                                    </div>
                                    <Badge variant={
                                        alert.severity === 'high' ? 'destructive' :
                                            alert.severity === 'medium' ? 'warning' as any : 'secondary'
                                    } className="text-[10px]">
                                        {alert.severity === 'high' ? dict.SmartAlerts.Severity.High :
                                            alert.severity === 'medium' ? dict.SmartAlerts.Severity.Medium : dict.SmartAlerts.Severity.Low}
                                    </Badge>
                                </div>
                                <CardTitle className="text-lg mt-3">{t(alert.titleKey)}</CardTitle>
                                <div className="flex items-center text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-wider">
                                    {getCategoryIcon(alert.type)}
                                    {alert.type === 'accounting' ? dict.SmartAlerts.Category.Accounting :
                                        alert.type === 'inventory' ? dict.SmartAlerts.Category.Inventory :
                                            alert.type === 'sales' ? dict.SmartAlerts.Category.Sales :
                                                alert.type === 'finance' ? dict.SmartAlerts.Category.Finance : dict.SmartAlerts.Category.System}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                <p className="text-sm text-slate-600 leading-relaxed min-h-[3rem]">
                                    {t(alert.messageKey, alert.messageParams)}
                                </p>
                                {alert.link && (
                                    <Link href={alert.link} className="block">
                                        <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-100 hover:bg-blue-50">
                                            {t(alert.actionLabelKey || 'SmartAlerts.ActionLabelDefault')}
                                        </Button>
                                    </Link>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Reference Cards */}
            <div className="mt-12">
                <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">{dict.SmartAlerts.TipsTitle}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="bg-blue-50/50 border-blue-100">
                        <CardContent className="p-4 flex gap-3 text-sm text-blue-800">
                            <Info className="shrink-0" size={18} />
                            <p>{dict.SmartAlerts.Tip1}</p>
                        </CardContent>
                    </Card>
                    <Card className="bg-amber-50/50 border-amber-100">
                        <CardContent className="p-4 flex gap-3 text-sm text-amber-800">
                            <AlertTriangle className="shrink-0" size={18} />
                            <p>{dict.SmartAlerts.Tip2}</p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function CalculatorIcon({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <rect width="16" height="20" x="4" y="2" rx="2" />
            <line x1="8" y1="6" x2="16" y2="6" />
            <line x1="16" y1="14" x2="16" y2="18" />
            <path d="M16 10h.01" />
            <path d="M12 10h.01" />
            <path d="M8 10h.01" />
            <path d="M12 14h.01" />
            <path d="M8 14h.01" />
            <path d="M12 18h.01" />
            <path d="M8 18h.01" />
        </svg>
    );
}
