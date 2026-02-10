"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Wallet, Loader2, ArrowUpRight, ArrowDownRight, Package } from "lucide-react";
import { addPartnerTransaction } from "../actions";
import { toast } from "sonner";
import { getProducts } from "@/features/inventory/actions";

import { TranslationKeys } from "@/lib/translation-types";

export function PartnerTransactionDialog({ partner, dict, onSuccess }: { partner: any; dict: TranslationKeys; onSuccess: () => void }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [type, setType] = useState<string>("withdrawal_cash");
    const [productsList, setProductsList] = useState<any[]>([]);
    const [selectedProduct, setSelectedProduct] = useState<string>("");

    useEffect(() => {
        if (open && type === 'withdrawal_goods') {
            getProducts().then(res => {
                if (res.success) setProductsList(res.data);
            });
        }
    }, [open, type]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        try {
            const res = await addPartnerTransaction({
                partnerId: partner.id,
                type: type as any,
                amount: parseFloat(formData.get("amount") as string),
                date: formData.get("date") as string,
                description: formData.get("description") as string,
                productId: type === 'withdrawal_goods' ? parseInt(selectedProduct) : undefined,
                quantity: type === 'withdrawal_goods' ? parseFloat(formData.get("quantity") as string) : undefined,
            });

            if (res.success) {
                toast.success(dict.PartnersManagement?.Transaction?.Success || "Success");
                setOpen(false);
                onSuccess();
            } else {
                toast.error(res.message || dict.PartnersManagement?.Transaction?.Error || "Error");
            }
        } catch (err) {
            toast.error(dict.PartnersManagement?.Transaction?.Error || "Error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 border-slate-200 hover:bg-slate-50 font-bold rounded-xl">
                    <Wallet size={16} className="text-blue-600" />
                    {dict.PartnersManagement?.Transaction?.Title}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] p-6 rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black text-slate-900 border-b pb-4 flex items-center gap-3">
                        {partner.name}
                        <span className="text-xs font-bold text-slate-400">| {dict.PartnersManagement?.Transaction?.Description}</span>
                    </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 mt-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Transaction?.Type}</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger className="rounded-xl h-11 border-slate-200 font-bold">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="withdrawal_cash" className="font-bold">🏦 {dict.PartnersManagement?.Transaction?.WithdrawalCash}</SelectItem>
                                    <SelectItem value="withdrawal_goods" className="font-bold">📦 {dict.PartnersManagement?.Transaction?.WithdrawalGoods}</SelectItem>
                                    <SelectItem value="capital_increase" className="font-bold">📈 {dict.PartnersManagement?.Transaction?.CapitalIncrease}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Transaction?.Date}</Label>
                                <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="rounded-xl h-11" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Transaction?.Amount}</Label>
                                <Input name="amount" type="number" step="0.01" required className="rounded-xl h-11 font-black" />
                            </div>
                        </div>

                        {type === 'withdrawal_goods' && (
                            <div className="grid grid-cols-2 gap-4 bg-orange-50/50 p-4 rounded-2xl border border-orange-100 animate-in fade-in slide-in-from-top-2">
                                <div className="space-y-2">
                                    <Label className="font-bold text-orange-700">{dict.PartnersManagement?.Transaction?.Product}</Label>
                                    <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                                        <SelectTrigger className="rounded-xl h-10 border-orange-200 bg-white">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {productsList.map(p => (
                                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="font-bold text-orange-700">{dict.PartnersManagement?.Transaction?.Quantity}</Label>
                                    <Input name="quantity" type="number" step="0.01" className="rounded-xl h-10 border-orange-200 bg-white" />
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="font-bold text-slate-700">{dict.PartnersManagement?.Transaction?.DescriptionLabel}</Label>
                            <Input name="description" placeholder={dict.PartnersManagement?.Transaction?.DescriptionPlaceholder} className="rounded-xl h-11 border-slate-200" />
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
