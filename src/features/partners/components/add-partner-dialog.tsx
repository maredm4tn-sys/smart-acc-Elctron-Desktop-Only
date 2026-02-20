"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserPlus, Loader2 } from "lucide-react";
import { createPartner } from "../actions";
import { toast } from "sonner";
import { TranslationKeys } from "@/lib/translation-types";

export function AddPartnerDialog({ dict, onSuccess }: { dict: TranslationKeys; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await createPartner({
                name: formData.get("name") as string,
                phone: formData.get("phone") as string,
                nationalId: formData.get("nationalId") as string,
                role: formData.get("role") as string,
                email: formData.get("email") as string,
                address: formData.get("address") as string,
                joinDate: formData.get("joinDate") as string,
                notes: formData.get("notes") as string,
                initialCapital: parseFloat(formData.get("capital") as string),
            });

            if (res.success) {
                toast.success(dict.Common.Success);
                setOpen(false);
                onSuccess();
            } else {
                toast.error(res.message);
            }
        } catch (err) {
            toast.error(dict.Common.Error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700 h-11 px-8 font-black rounded-2xl shadow-lg shadow-blue-100">
                    <UserPlus size={18} />
                    {dict.PartnersManagement?.NewPartner}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] p-0 rounded-3xl border-none shadow-2xl overflow-hidden bg-white">
                <DialogHeader className="bg-slate-50 p-6 border-b border-slate-100">
                    <DialogTitle className="text-2xl font-black text-slate-900 flex items-center gap-2">
                        <UserPlus className="text-blue-600" />
                        {dict.PartnersManagement?.NewPartner}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Table?.Name}</Label>
                                <Input name="name" required placeholder={dict.PartnersManagement?.Table?.Name} className="rounded-xl h-11 border-slate-200 focus:ring-blue-500" />
                            </div>
                            <div className="space-y-2 col-span-2 md:col-span-1">
                                <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Table?.Role}</Label>
                                <Input name="role" placeholder={dict.PartnersManagement?.Table?.Role} className="rounded-xl h-11 border-slate-200" />
                            </div>
                        </div>

                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Suppliers?.AddDialog?.Phone}</Label>
                                <Input name="phone" placeholder="01xxxxxxxxx" className="rounded-xl h-11 border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Partners?.DetailsDialog?.Email}</Label>
                                <Input name="email" type="email" placeholder="example@mail.com" className="rounded-xl h-11 border-slate-200" />
                            </div>
                        </div>

                        {/* Identity & Address */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Customers?.AddDialog?.NationalId}</Label>
                                <Input name="nationalId" className="rounded-xl h-11 border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Partners?.DetailsDialog?.JoinDate}</Label>
                                <Input name="joinDate" type="date" className="rounded-xl h-11 border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.Partners?.DetailsDialog?.Address}</Label>
                            <Input name="address" placeholder={dict.Partners?.DetailsDialog?.Address} className="rounded-xl h-11 border-slate-200" />
                        </div>

                        {/* Financials */}
                        <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 space-y-4">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <span className="text-lg font-black">$</span>
                                </div>
                                <div>
                                    <Label className="font-black text-blue-900 text-lg block">{dict.PartnersManagement?.InitialCapital}</Label>
                                </div>
                            </div>
                            <Input
                                name="capital"
                                type="number"
                                step="0.01"
                                required
                                placeholder="0.00"
                                className="rounded-xl h-14 text-2xl font-black bg-white border-blue-200 text-center"
                            />
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.Common?.Note}</Label>
                            <Textarea name="notes" placeholder={dict.Partners?.DetailsDialog?.Notes} className="rounded-xl border-slate-200 min-h-[100px] resize-none" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 p-6 border-t bg-slate-50/50">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold text-slate-500 hover:bg-slate-200/50 rounded-xl h-12 px-6">
                            {dict.Common.Cancel}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-12 px-10 font-black rounded-xl shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] active:scale-95">
                            {loading ? <Loader2 className="animate-spin" /> : dict.Common.Confirm}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
