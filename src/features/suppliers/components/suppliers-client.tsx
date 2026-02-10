"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, CloudOff, Search } from "lucide-react";
import { SupplierActions } from "@/features/suppliers/components/supplier-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Num } from "@/components/ui/num";

import { TranslationKeys } from "@/lib/translation-types";

export function SuppliersClient({ initialSuppliers = [], dict }: { initialSuppliers?: any[], dict: TranslationKeys }) {
    const [suppliers, setSuppliers] = useState(initialSuppliers);
    const [isOffline, setIsOffline] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (navigator.onLine && initialSuppliers?.length > 0) {
            mirrorData(STORES.SUPPLIERS, initialSuppliers);
        }

        const handleOffline = async () => {
            setIsOffline(true);
            const local = await getLocalData(STORES.SUPPLIERS);
            if (local.length > 0) setSuppliers(local);
        };

        const handleOnline = () => {
            setIsOffline(false);
            window.location.reload();
        };

        window.addEventListener('offline', handleOffline);
        window.addEventListener('online', handleOnline);

        if (!navigator.onLine) handleOffline();

        return () => {
            window.removeEventListener('offline', handleOffline);
            window.removeEventListener('online', handleOnline);
        };
    }, [initialSuppliers]);

    const filteredSuppliers = (suppliers || []).filter(s => {
        const nameMatch = (s.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const companyMatch = (s.companyName || s.company_name || "").toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || companyMatch;
    });

    return (
        <div className="space-y-4" dir={dict.Common.Direction as any}>
            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center gap-2 text-amber-700 text-sm animate-pulse">
                    <CloudOff size={18} />
                    <span>{dict.Common.Offline.ConnectionLost}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full max-w-sm">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-slate-400" />
                    </div>
                    <Input
                        placeholder={dict.Common.Search}
                        className="pr-10 text-right h-10 border-slate-200 focus:border-blue-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <Card className="border-none shadow-md overflow-hidden">
                <CardHeader className="pb-2 bg-slate-50/50">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Truck className="h-5 w-5 text-blue-600" />
                        {dict.Suppliers.ListTitle}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rounded-md border overflow-x-auto border-slate-100">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="text-start font-bold text-slate-700">{dict.Suppliers.Table.Name}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-700">{dict.Suppliers.Table.Company}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-700">{dict.Suppliers.Table.Address}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-700">{dict.Suppliers.Table.Phone}</TableHead>
                                    <TableHead className="text-start font-bold text-slate-700">{dict.Suppliers.Table.TaxId}</TableHead>
                                    <TableHead className="text-start w-[120px] font-bold text-slate-700">{dict.Suppliers.Table.Actions}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSuppliers?.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-48 text-slate-400 italic">
                                            {dict.Suppliers.Table.NoSuppliers}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredSuppliers?.map((s, idx) => (
                                        <TableRow key={s.id || `sup-${idx}-${Date.now()}`} className="hover:bg-slate-50/50 transition-colors">
                                            <TableCell className="text-start font-bold text-slate-900">{s.name}</TableCell>
                                            <TableCell className="text-start">{s.companyName || s.company_name || "-"}</TableCell>
                                            <TableCell className="text-start">
                                                <div className="truncate max-w-[200px] text-slate-500" title={s.address || ""}>{s.address || "-"}</div>
                                            </TableCell>
                                            <TableCell className="text-start font-mono text-xs text-blue-600">
                                                <Num value={s.phone || "-"} />
                                            </TableCell>
                                            <TableCell className="text-start font-mono text-xs text-purple-600">
                                                <Num value={s.taxId || s.tax_id || "-"} />
                                            </TableCell>
                                            <TableCell className="text-start">
                                                <div className="flex justify-start">
                                                    <SupplierActions supplier={s} dict={dict} />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
