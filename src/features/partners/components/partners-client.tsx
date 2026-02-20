"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Num } from "@/components/ui/num";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, FileText, TrendingUp, UserPlus, Users, ArrowRightLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { getPartners } from "../actions";
import { AddPartnerDialog } from "./add-partner-dialog";
import { PartnerTransactionDialog } from "./partner-transaction-dialog";
import { ProfitDistributionDialog } from "./profit-distribution-dialog";
import { PartnerStatementDialog } from "./partner-statement-dialog";
import { BulkImportPartnersDialog } from "./bulk-import-partners-dialog";
import { exportToExcel } from "@/lib/export-excel";
import { TranslationKeys } from "@/lib/translation-types";
import { PartnerDetailsDialog } from "./partner-details-dialog";

interface PartnersClientProps {
    initialPartners: any[];
    dict: TranslationKeys;
}

export function PartnersClient({ initialPartners, dict }: PartnersClientProps) {
    const { currency } = useSettings();
    const [partners, setPartners] = useState(initialPartners);
    const [loading, setLoading] = useState(false);
    const [selectedPartner, setSelectedPartner] = useState<any>(null);
    const [showDetails, setShowDetails] = useState(false);

    const refresh = async () => {
        setLoading(true);
        const res = await getPartners();
        if (res.success) setPartners(res.data);
        setLoading(false);
    };

    const totalCapital = partners.reduce((acc, p) => acc + parseFloat(p.currentCapital || "0"), 0);

    return (
        <div className="space-y-6 pb-10" dir={dict.Common.Direction as any}>
            {/* Header with Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                <div className="relative text-start">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        <Users className="text-blue-600 w-10 h-10" />
                        {dict.PartnersManagement?.Title}
                    </h1>
                    <p className="text-slate-500 font-bold mt-2 text-lg italic">{dict.PartnersManagement?.Description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(partners, 'Partners', 'PartnersList')}
                        className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold gap-2 shadow-sm rounded-xl h-10 px-4"
                    >
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                        <span className="hidden sm:inline">{dict.PartnersManagement?.ExportExcel}</span>
                    </Button>
                    <BulkImportPartnersDialog />
                    <ProfitDistributionDialog dict={dict} onSuccess={refresh} />
                    <AddPartnerDialog dict={dict} onSuccess={refresh} />
                </div>
            </div>

            {/* Main Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="bg-gradient-to-br from-slate-800 to-slate-950 text-white border-none shadow-xl p-2 group hover:scale-[1.02] transition-transform">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs font-black opacity-80 uppercase tracking-widest flex items-center gap-2 text-start">
                            <TrendingUp size={16} /> {dict.PartnersManagement?.CurrentCapital}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-start">
                        <div className="text-4xl font-black tracking-tighter tabular-nums">{formatCurrency(totalCapital, currency)}</div>
                        <p className="text-[10px] font-bold mt-3 text-slate-400 uppercase tracking-widest">{dict.PartnersManagement?.TotalInvestments}</p>
                    </CardContent>
                </Card>

                <Card className="bg-white border-slate-200 shadow-sm p-2">
                    <CardHeader className="pb-1">
                        <CardTitle className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2 text-start">
                            <Users size={16} /> {dict.PartnersManagement?.Count}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-start">
                        <div className="text-4xl font-black text-slate-900 tracking-tighter tabular-nums">
                            <Num value={partners.filter(p => p.isActive).length} />
                        </div>
                        <p className="text-[10px] font-bold mt-3 text-slate-400 uppercase tracking-widest italic">{dict.PartnersManagement?.ActiveCount}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Partners Table */}
            <Card className="border-slate-200 shadow-xl rounded-2xl overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Name}</TableHead>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Role}</TableHead>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Share}</TableHead>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Capital}</TableHead>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Balance}</TableHead>
                            <TableHead className="font-black text-slate-900 text-start">{dict.PartnersManagement?.Table?.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {partners.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-20 text-slate-400 font-bold italic">
                                    {dict.PartnersManagement?.NoPartners}
                                </TableCell>
                            </TableRow>
                        ) : (
                            partners.map((partner) => (
                                <TableRow key={partner.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell
                                        className="font-bold text-slate-900 text-start cursor-pointer hover:bg-slate-100 transition-colors"
                                        onClick={() => { setSelectedPartner(partner); setShowDetails(true); }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black shadow-sm">
                                                {partner.name?.[0]?.toUpperCase()}
                                            </div>
                                            <span className="hover:text-blue-700 hover:underline decoration-blue-300 underline-offset-4 decoration-2">{partner.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-slate-500 font-medium italic text-start">{partner.role || "-"}</TableCell>
                                    <TableCell className="text-start">
                                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-50 text-blue-700 border border-blue-100 font-mono tabular-nums">
                                            <Num value={parseFloat(partner.sharePercentage || "0")} precision={2} />%
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-start font-black text-slate-800 font-mono tabular-nums">
                                        {formatCurrency(parseFloat(partner.currentCapital || "0"), currency)}
                                    </TableCell>
                                    <TableCell className="text-start">
                                        <span className={`font-black font-mono tabular-nums ${parseFloat(partner.currentBalance) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {formatCurrency(Math.abs(parseFloat(partner.currentBalance || "0")), currency)}
                                            <span className="text-[10px] ms-1 opacity-60 font-bold">
                                                {parseFloat(partner.currentBalance) >= 0 ? `(${dict.PartnersManagement?.ProfitLabel})` : `(${dict.PartnersManagement?.DebtLabel})`}
                                            </span>
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-start">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => { setSelectedPartner(partner); setShowDetails(true); }}
                                                title={dict.Partners?.Table?.ViewDetails}
                                            >
                                                <FileText size={16} />
                                            </Button>
                                            <PartnerTransactionDialog partner={partner} dict={dict} onSuccess={refresh} />
                                            <PartnerStatementDialog partner={partner} dict={dict} />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            <PartnerDetailsDialog
                partner={selectedPartner}
                open={showDetails}
                onOpenChange={setShowDetails}
            />
        </div>
    );
}
