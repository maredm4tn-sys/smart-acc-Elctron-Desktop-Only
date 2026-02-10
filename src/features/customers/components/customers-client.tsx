"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Users, CloudOff, Search } from "lucide-react";
import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { CustomerImport } from "@/features/customers/components/customer-import";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerActions } from "@/features/customers/components/customer-actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { Num } from "@/components/ui/num";

export function CustomersClient({ initialCustomers = [], dict, session, representatives = [] }: { initialCustomers?: any[], dict: any, session: any, representatives?: any[] }) {
    const [customers, setCustomers] = useState(initialCustomers);
    const [isOffline, setIsOffline] = useState(false);
    const [activeFilter, setActiveFilter] = useState<'all' | 'debtor' | 'creditor'>('all');
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(false);

    // Filter & Search effect
    useEffect(() => {
        const filterData = () => {
            setLoading(true);
            let filtered = initialCustomers;

            // Apply Search
            if (searchTerm) {
                const s = searchTerm.toLowerCase();
                filtered = filtered.filter(c =>
                    (c.name?.toLowerCase().includes(s)) ||
                    (c.companyName?.toLowerCase().includes(s)) ||
                    (c.phone?.includes(s))
                );
            }

            // Apply Tab Filter
            if (activeFilter !== 'all') {
                filtered = filtered.filter(c => {
                    const debt = Number(c?.totalDebt || 0);
                    if (activeFilter === 'debtor') return debt > 0.01;
                    if (activeFilter === 'creditor') return debt < -0.01;
                    return true;
                });
            }

            setCustomers(filtered);
            setLoading(false);
        };

        filterData();
    }, [activeFilter, initialCustomers, searchTerm]);

    useEffect(() => {
        if (navigator.onLine && initialCustomers.length > 0) {
            mirrorData(STORES.CUSTOMERS, initialCustomers);
        }

        const handleOffline = async () => {
            setIsOffline(true);
            const local = await getLocalData(STORES.CUSTOMERS);
            if (local?.length > 0) setCustomers(local);
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
    }, [initialCustomers]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500" dir={dict.Common.Direction as any}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">{dict.Customers.Title}</h1>
                    <p className="text-slate-500 mt-1">{dict.Customers.Description}</p>
                </div>
                <div className="flex items-center gap-3 self-end">
                    <CustomerImport />
                    <AddCustomerDialog representatives={representatives} />
                </div>
            </div>

            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-start gap-3 text-amber-700 shadow-sm animate-pulse">
                    <CloudOff size={18} />
                    <span className="text-sm font-medium">{dict.Common.Offline.NoConnection}</span>
                </div>
            )}

            {/* Smart Filter & Search Bar */}
            <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
                <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <span className="absolute inset-y-0 right-3 flex items-center text-slate-400">
                                <Search className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                placeholder={(dict.Common?.Search || "Search") + "..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full h-9 rounded-md border border-slate-200 bg-white pr-9 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                        <Button
                            variant={activeFilter === 'all' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveFilter('all')}
                            className={activeFilter === 'all' ? "bg-white shadow-sm" : "text-slate-600"}
                        >
                            {dict.Common.All}
                        </Button>
                        <Button
                            variant={activeFilter === 'debtor' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveFilter('debtor')}
                            className={activeFilter === 'debtor' ? "bg-white shadow-sm text-red-600 font-bold" : "text-slate-600 hover:text-red-500"}
                        >
                            {dict.Customers.Filter.Debtors}
                        </Button>
                        <Button
                            variant={activeFilter === 'creditor' ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setActiveFilter('creditor')}
                            className={activeFilter === 'creditor' ? "bg-white shadow-sm text-emerald-600 font-bold" : "text-slate-600 hover:text-emerald-500"}
                        >
                            {dict.Customers.Filter.Creditors}
                        </Button>
                    </div>
                </div>

                <div className="hidden lg:block overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead className="text-start font-bold text-slate-700">{dict.Customers.Table.Name}</TableHead>
                                <TableHead className="text-start font-bold text-slate-700 hidden xl:table-cell">{dict.Customers.Table.Company}</TableHead>
                                <TableHead className="text-start font-bold text-slate-700 hidden md:table-cell">{dict.Customers.Table.Phone}</TableHead>
                                <TableHead className="text-start font-bold text-slate-700">{dict.Customers.Table.TotalDebt}</TableHead>
                                <TableHead className="text-center font-bold text-slate-700 w-[120px]">{dict.Customers.Table.Actions}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!customers || customers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-48 text-slate-400 italic">
                                        {dict.Customers.Table.NoCustomers}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customers.map((c) => (
                                    <TableRow key={c?.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <TableCell className="text-start font-medium">
                                            <div className="flex flex-col group-hover:text-blue-600 transition-colors">
                                                {c?.name === 'System_Cash_Customer' ? dict.Common.CashCustomer : (c?.name || "-")}
                                                {c?.address && <span className="text-[10px] text-slate-400 font-normal">{c?.address}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-start text-slate-600 hidden xl:table-cell">
                                            {c?.companyName || "-"}
                                        </TableCell>
                                        <TableCell className="text-start font-mono text-slate-600 text-xs hidden md:table-cell">
                                            <Num value={c?.phone || "-"} />
                                        </TableCell>
                                        <TableCell className="text-start">
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`font-bold tabular-nums ${Number(c?.totalDebt || 0) > 0.01 ? 'text-red-600' : Number(c?.totalDebt || 0) < -0.01 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <Num value={Math.abs(Number(c?.totalDebt || 0))} precision={2} showGrouping={true} />
                                                    <span className="text-[10px] ml-1 font-normal opacity-70">
                                                        {Number(c?.totalDebt || 0) > 0.01 ? dict.Customers.Statement.Summary.DebitLabel : Number(c?.totalDebt || 0) < -0.01 ? dict.Customers.Statement.Summary.CreditLabel : ''}
                                                    </span>
                                                </span>
                                                {Number(c?.creditLimit || 0) > 0 && Number(c?.totalDebt || 0) > Number(c?.creditLimit || 0) && (
                                                    <Badge variant="destructive" className="text-[10px] px-1 py-0 flex items-center gap-1 shadow-none">
                                                        <AlertTriangle size={10} />
                                                        {dict.Customers.Table.LimitExceeded}
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center px-4">
                                            <div className="flex justify-center">
                                                <CustomerActions
                                                    customer={c}
                                                    currentRole={session?.role}
                                                    dict={dict}
                                                    representatives={representatives}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Card List */}
                <div className="lg:hidden space-y-4 p-4 pb-20">
                    {!customers || customers.length === 0 ? (
                        <div className="text-center p-12 text-slate-400 italic bg-slate-50/50 rounded-xl">{dict.Customers.Table.NoCustomers}</div>
                    ) : (
                        customers.map((c) => (
                            <Card key={c?.id} className="border-none shadow-sm bg-white overflow-hidden">
                                <div className="p-4 space-y-3">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                                <Users className="h-4 w-4 text-blue-600" />
                                                {c?.name === 'System_Cash_Customer' ? dict.Common.CashCustomer : (c?.name || "-")}
                                            </div>
                                            {c?.companyName && <p className="text-xs text-slate-500 mt-1">{c?.companyName}</p>}
                                        </div>
                                        <CustomerActions
                                            customer={c}
                                            currentRole={session?.role}
                                            dict={dict}
                                            representatives={representatives}
                                        />
                                    </div>
                                    <div className="pt-2 space-y-2 text-sm">
                                        {c?.phone && (
                                            <div className="flex justify-between items-center border-b border-slate-50 pb-2">
                                                <span className="text-slate-500">{dict.Customers.Table.Phone}:</span>
                                                <span className="font-mono text-slate-700">
                                                    <Num value={c?.phone} />
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex justify-between items-center pt-1">
                                            <span className="text-slate-500 font-medium">{dict.Customers.Table.TotalDebt}:</span>
                                            <div className="flex flex-col items-start gap-1">
                                                <span className={`font-bold tabular-nums ${Number(c?.totalDebt || 0) > 0.01 ? 'text-red-600' : Number(c?.totalDebt || 0) < -0.01 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <Num value={Math.abs(Number(c?.totalDebt || 0))} precision={2} showGrouping={true} />
                                                </span>
                                                {Number(c?.creditLimit || 0) > 0 && Number(c?.totalDebt || 0) > Number(c?.creditLimit || 0) && (
                                                    <Badge variant="destructive" className="text-[10px] px-1 py-0 shadow-none">
                                                        {dict.Customers.Table.LimitExceeded}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            </Card>
        </div>
    );
}
