"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
                    {dict.PartnersManagement?.NewPartner || "إضافة شريك جديد"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl border-none shadow-2xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-4">
                        {dict.PartnersManagement?.NewPartner || "إضافة شريك جديد"}
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Table?.Name || "الاسم"}</Label>
                            <Input name="name" required placeholder={dict.PartnersManagement?.Table?.Name || "الاسم"} className="rounded-xl h-11 border-slate-200 focus:ring-blue-500" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Suppliers?.AddDialog?.Phone || "رقم الهاتف"}</Label>
                                <Input name="phone" placeholder="01xxxxxxxxx" className="rounded-xl h-11 border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Table?.Role || "الصفة"}</Label>
                                <Input name="role" placeholder={dict.PartnersManagement?.Table?.Role || "الصفة"} className="rounded-xl h-11 border-slate-200" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.Customers?.AddDialog?.NationalId || "الرقم القومي"}</Label>
                            <Input name="nationalId" className="rounded-xl h-11 border-slate-200" />
                        </div>

                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <Label className="font-black text-blue-900 block mb-2">{dict.PartnersManagement?.InitialCapital || "رأس المال المبدئي"}</Label>
                            <Input
                                name="capital"
                                type="number"
                                step="0.01"
                                required
                                className="rounded-xl h-12 text-lg font-black bg-white border-blue-200"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="font-bold text-slate-500">
                            {dict.Common.Cancel}
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-11 px-10 font-black rounded-xl">
                            {loading ? <Loader2 className="animate-spin" /> : dict.Common.Confirm}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
