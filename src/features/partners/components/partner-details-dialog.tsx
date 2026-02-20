"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar, CreditCard, Mail, MapPin, Phone, User, FileText, Banknote, Briefcase, Hash } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";

interface Partner {
    id: number;
    name: string;
    phone?: string | null;
    nationalId?: string | null;
    email?: string | null;
    address?: string | null;
    joinDate?: string | null;
    role?: string | null;
    initialCapital: string;
    currentCapital: string;
    sharePercentage?: string | null;
    currentBalance: string;
    notes?: string | null;
}

export function PartnerDetailsDialog({
    partner,
    open,
    onOpenChange
}: {
    partner: Partner | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any;

    if (!partner) return null;

    const DetailItem = ({ icon: Icon, label, value }: { icon: any, label: string, value: string | null | undefined }) => (
        <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-slate-100 transition-colors">
            <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0 text-blue-600">
                <Icon size={18} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-base font-semibold text-slate-900 break-words">{value || "-"}</p>
            </div>
        </div>
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-[32px] p-0 overflow-hidden border-none shadow-2xl bg-white">
                {/* Header Banner */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                    <div className="relative z-10">
                        <DialogHeader>
                            <DialogTitle className="text-3xl font-black flex items-center gap-4">
                                <User className="h-8 w-8 text-blue-200" />
                                {partner.name}
                            </DialogTitle>
                            <div className="mt-2 flex items-center gap-2 text-blue-100">
                                <Briefcase size={16} />
                                <span className="text-lg font-medium">{partner.role}</span>
                            </div>
                        </DialogHeader>
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Financial Summary Cards */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1 bg-green-50 p-4 rounded-2xl border border-green-100">
                            <p className="text-xs font-bold text-green-600 mb-1">{dict.Partners?.DetailsDialog?.SharePercentage}</p>
                            <p className="text-2xl font-black text-green-700">{partner.sharePercentage || "0"}%</p>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-500 mb-1">{dict.Partners?.DetailsDialog?.CurrentCapital}</p>
                                <p className="text-2xl font-black text-slate-800">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(Number(partner.currentCapital))}
                                </p>
                            </div>
                            <Banknote className="text-slate-300 h-10 w-10" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                        <DetailItem icon={Phone} label={dict.Partners?.DetailsDialog?.Phone} value={partner.phone} />
                        <DetailItem icon={Mail} label={dict.Partners?.DetailsDialog?.Email} value={partner.email} />
                        <DetailItem icon={Hash} label={dict.Partners?.DetailsDialog?.NationalId} value={partner.nationalId} />
                        <DetailItem icon={Calendar} label={dict.Partners?.DetailsDialog?.JoinDate} value={partner.joinDate} />
                        <DetailItem icon={MapPin} label={dict.Partners?.DetailsDialog?.Address} value={partner.address} />
                        <DetailItem icon={CreditCard} label={dict.Partners?.DetailsDialog?.InitialCapital} value={new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EGP' }).format(Number(partner.initialCapital))} />
                    </div>

                    {partner.notes && (
                        <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100">
                            <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold">
                                <FileText size={18} />
                                {dict.Partners?.DetailsDialog?.Notes}
                            </div>
                            <p className="text-amber-900 leading-relaxed text-sm">
                                {partner.notes}
                            </p>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <Button onClick={() => onOpenChange(false)} variant="outline" className="rounded-xl px-8 font-bold text-slate-600 hover:bg-slate-50 border-slate-200">
                            {dict.Partners?.DetailsDialog?.Close}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
