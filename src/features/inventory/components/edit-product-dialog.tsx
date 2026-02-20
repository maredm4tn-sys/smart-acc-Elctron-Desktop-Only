"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { updateProduct, getCategories } from "../actions";
import { Pencil, RefreshCw, Package } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function EditProductDialog({ product, open: externalOpen, onOpenChange: externalOnOpenChange }: { product: any, open?: boolean, onOpenChange?: (open: boolean) => void }) {
    const [internalOpen, setInternalOpen] = useState(false);
    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = externalOnOpenChange !== undefined ? externalOnOpenChange : setInternalOpen;

    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const { dict } = useTranslation() as any;

    useEffect(() => {
        if (open) {
            getCategories().then(setCategories);
        }
    }, [open]);

    const productSchema = z.object({
        name: z.string().min(2, dict.Dialogs.AddProduct.Errors.NameRequired),
        sku: z.string().min(1, dict.Dialogs.AddProduct.Errors.SKURequired),
        barcode: z.string().optional().nullable(),
        type: z.enum(["goods", "service"]),
        sellPrice: z.coerce.number().min(0, dict.Dialogs.AddProduct.Errors.PricePositive),
        priceWholesale: z.coerce.number().min(0).default(0),
        priceHalfWholesale: z.coerce.number().min(0).default(0),
        priceSpecial: z.coerce.number().min(0).default(0),
        buyPrice: z.coerce.number().min(0).default(0),
        stockQuantity: z.coerce.number().min(0).default(0),
        minStock: z.coerce.number().min(0).default(0),
        location: z.string().optional().nullable(),
        requiresToken: z.boolean().default(false),
        categoryId: z.number().optional().nullable(),
    });

    type ProductFormValues = z.infer<typeof productSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema) as any,
        defaultValues: {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            type: product.type,
            sellPrice: Number(product.sellPrice || 0),
            priceWholesale: Number(product.priceWholesale || 0),
            priceHalfWholesale: Number(product.priceHalfWholesale || 0),
            priceSpecial: Number(product.priceSpecial || 0),
            buyPrice: Number(product.buyPrice || 0),
            stockQuantity: Number(product.stockQuantity || 0),
            minStock: Number(product.minStock || 0),
            location: product.location,
            requiresToken: Boolean(product.requiresToken),
            categoryId: product.categoryId,
        },
    });

    const onSubmit = async (data: ProductFormValues) => {
        try {
            const response = await updateProduct({
                id: product.id,
                ...data,
            } as any);

            if (response.success) {
                toast.success(response.message || dict.Dialogs?.EditProduct?.Success);
                setOpen(false);
            } else {
                toast.error(response.message || dict.Common?.Error);
            }
        } catch (error) {
            toast.error(dict.Common?.Error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {externalOpen === undefined && (
                <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="hover:bg-blue-50 transition-colors">
                        <Pencil className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[700px] overflow-y-auto max-h-[90vh]" dir="rtl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Package className="h-6 w-6 text-blue-600" />
                        {dict.Dialogs.EditProduct.Title}
                    </DialogTitle>
                    <DialogDescription className="text-right">
                        {dict.Dialogs.EditProduct.Description}: <span className="font-bold text-slate-900">{product.name}</span>
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-sku">{dict.Dialogs.AddProduct.SKU}</Label>
                            <Input id="edit-sku" {...register("sku")} disabled className="bg-slate-100 font-mono text-center border-slate-300" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-barcode">{dict.Dialogs.AddProduct.Barcode}</Label>
                            <Input id="edit-barcode" {...register("barcode")} className="text-center font-mono border-slate-300" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.Type}</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue={product.type}>
                                <SelectTrigger> <SelectValue /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goods">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                                    <SelectItem value="service">{dict.Dialogs.AddProduct.Service}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">{dict.Dialogs.AddProduct.Name}</Label>
                            <Input id="edit-name" {...register("name")} className="font-bold" />
                            {errors.name && <p className="text-sm text-red-500">{errors.name.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.Category}</Label>
                            <Select onValueChange={(val) => setValue("categoryId", val === "null" ? null : Number(val))} defaultValue={product?.categoryId?.toString() || "null"}>
                                <SelectTrigger>
                                    <SelectValue placeholder={dict.Dialogs.AddProduct.SelectCategory} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="null">---</SelectItem>
                                    {categories?.map((c) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-bold text-slate-700">{dict.Dialogs.AddProduct.PricesSection}</h4>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            <div className="space-y-1">
                                <Label className="text-[10px] text-slate-500">{dict.Dialogs.AddProduct.BuyPrice}</Label>
                                <Input type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} className="h-9 text-center font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-green-600 font-bold">{dict.Dialogs.AddProduct.SellPrice}</Label>
                                <Input type="number" step="0.01" {...register("sellPrice", { valueAsNumber: true })} className="h-9 text-center font-mono border-green-200 text-green-700 font-bold" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-blue-600">{dict.Dialogs.AddProduct.Wholesale}</Label>
                                <Input type="number" step="0.01" {...register("priceWholesale", { valueAsNumber: true })} className="h-9 text-center font-mono border-blue-100" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-indigo-600">{dict.Dialogs.AddProduct.HalfWholesale}</Label>
                                <Input type="number" step="0.01" {...register("priceHalfWholesale", { valueAsNumber: true })} className="h-9 text-center font-mono border-indigo-100" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-[10px] text-purple-600">{dict.Dialogs.AddProduct.Special}</Label>
                                <Input type="number" step="0.01" {...register("priceSpecial", { valueAsNumber: true })} className="h-9 text-center font-mono border-purple-100" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4">
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.OpeningStock}</Label>
                            <Input type="number" {...register("stockQuantity", { valueAsNumber: true })} className="text-center font-bold bg-slate-50" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.MinStock}</Label>
                            <Input type="number" {...register("minStock", { valueAsNumber: true })} className="text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Dialogs.AddProduct.Location}</Label>
                            <Input {...register("location")} placeholder="Location..." />
                        </div>
                    </div>

                    <DialogFooter className="gap-2">
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 h-10">
                            {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : dict.Dialogs.EditProduct.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
