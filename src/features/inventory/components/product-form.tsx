"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { createProduct, getCategories } from "../actions";
import { RefreshCw, Package, PlusCircle } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";
import { CategoryManagerDialog } from "./category-manager-dialog";
import { AddUnitDialog } from "./add-unit-dialog";

export function ProductForm() {
    const { dict, dir } = useTranslation() as any;
    const router = useRouter();
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: number; name: string }[]>([]);

    const fetchCategories = async () => {
        const cats = await getCategories();
        setCategories(cats || []);
    };

    const fetchUnits = async () => {
        const { getUnits } = await import("../actions");
        const u = await getUnits();
        setUnits(u || []);
    };

    useEffect(() => {
        fetchCategories();
        fetchUnits();
    }, []);

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
        unitId: z.number().optional().nullable(),
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
            sku: `PROD-${Math.floor(100000 + Math.random() * 900000)}`,
            type: "goods",
            sellPrice: 0,
            priceWholesale: 0,
            priceHalfWholesale: 0,
            priceSpecial: 0,
            buyPrice: 0,
            stockQuantity: 0,
            minStock: 0,
            requiresToken: false,
        },
    });

    const onSubmit = async (data: any) => {
        try {
            const response = await createProduct({
                ...data,
            });

            if (response.success) {
                toast.success(response.message);
                router.push("/dashboard/inventory");
                router.refresh();
            } else {
                toast.error(response.message || dict.Common.Error);
            }
        } catch (error: any) {
            console.error("Submission error:", error);
            toast.error(error.message || dict.Common.Error);
        }
    };

    const generateSKU = () => {
        const random = `PROD-${Math.floor(100000 + Math.random() * 900000)}`;
        setValue("sku", random);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir={dir}>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                <div className="md:col-span-6 space-y-2 text-right">
                    <Label htmlFor="name" className="text-base block">{dict.Dialogs.AddProduct.Name} <span className="text-red-500">*</span></Label>
                    <Input id="name" placeholder={dict.Dialogs.AddProduct.Name} {...register("name")} className="h-10 text-right" />
                    {errors.name && <p className="text-sm text-red-500">{String(errors.name.message)}</p>}
                </div>

                <div className="md:col-span-3 space-y-2 text-right">
                    <Label htmlFor="sku" className="block">{dict.Dialogs.AddProduct.SKU} <span className="text-red-500">*</span></Label>
                    <div className="flex flex-row-reverse">
                        <Input id="sku" {...register("sku")} className="h-10 rounded-r-none border-r-0 text-center font-mono" />
                        <Button type="button" variant="outline" size="icon" onClick={generateSKU} title={dict.Inventory.ProductForm.GenerateSKU} className="h-10 w-10 rounded-l-none border-l bg-slate-50 hover:bg-slate-100">
                            <RefreshCw className="h-4 w-4 text-slate-600" />
                        </Button>
                    </div>
                    {errors.sku && <p className="text-sm text-red-500">{String(errors.sku.message)}</p>}
                </div>

                <div className="md:col-span-3 space-y-2 text-right">
                    <Label htmlFor="barcode" className="block">{dict.Dialogs.AddProduct.Barcode}</Label>
                    <Input id="barcode" placeholder={dict.Inventory.ProductForm.Scan} {...register("barcode")} className="h-10 text-center bg-slate-50 border-slate-200" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 text-right">
                    <Label className="block">{dict.Dialogs.AddProduct.Category}</Label>
                    <div className="flex gap-2">
                        <Select onValueChange={(val) => setValue("categoryId", val === "null" ? null : Number(val))}>
                            <SelectTrigger className="bg-white text-right">
                                <SelectValue placeholder={dict.Dialogs.AddProduct.SelectCategory} />
                            </SelectTrigger>
                            <SelectContent dir={dir}>
                                <SelectItem value="null">---</SelectItem>
                                {categories?.length > 0 && categories.map((c) => (
                                    <SelectItem key={c?.id} value={c?.id?.toString() || ""}>{c?.name || dict.NA}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <CategoryManagerDialog onCategoryAdded={fetchCategories} trigger={<Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>} />
                    </div>
                </div>

                <div className="space-y-2 text-right">
                    <Label className="block">{dict.Dialogs.AddProduct.Unit}</Label>
                    <div className="flex gap-2">
                        <Select onValueChange={(val) => setValue("unitId", val === "null" ? null : Number(val))}>
                            <SelectTrigger className="bg-white text-right">
                                <SelectValue placeholder={dict.Dialogs.AddProduct.SelectUnit} />
                            </SelectTrigger>
                            <SelectContent dir={dir}>
                                <SelectItem value="null">---</SelectItem>
                                {units?.length > 0 && units.map((u) => (
                                    <SelectItem key={u?.id} value={u?.id?.toString() || ""}>{u?.name || dict.NA}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <AddUnitDialog onUnitAdded={fetchUnits} trigger={<Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>} />
                    </div>
                </div>

                <div className="space-y-2 text-right">
                    <Label className="block">{dict.Dialogs.AddProduct.Type}</Label>
                    <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="goods">
                        <SelectTrigger className="text-right"> <SelectValue /> </SelectTrigger>
                        <SelectContent dir="rtl">
                            <SelectItem value="goods">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                            <SelectItem value="service">{dict.Dialogs.AddProduct.Service}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <h4 className="font-semibold text-slate-700 flex items-center gap-2 justify-end">
                    {dict.Dialogs.AddProduct.PricesSection} <span className="text-xl">💰</span>
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-2 text-right">
                        <Label htmlFor="buyPrice" className="text-slate-600 text-xs font-bold block">{dict.Dialogs.AddProduct.BuyPrice}</Label>
                        <Input id="buyPrice" type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} className="bg-white border-slate-300 text-center font-mono" />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="sellPrice" className="text-green-700 font-bold text-xs block">{dict.Dialogs.AddProduct.SellPrice}</Label>
                        <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice", { valueAsNumber: true })} className="bg-white border-green-300 focus:ring-green-500 font-bold text-green-700 text-center font-mono" />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="priceWholesale" className="text-blue-700 font-medium text-xs block">{dict.Dialogs.AddProduct.Wholesale}</Label>
                        <Input id="priceWholesale" type="number" step="0.01" {...register("priceWholesale", { valueAsNumber: true })} className="bg-white border-blue-200 text-center font-mono" />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="priceHalfWholesale" className="text-indigo-700 font-medium text-xs block">{dict.Dialogs.AddProduct.HalfWholesale}</Label>
                        <Input id="priceHalfWholesale" type="number" step="0.01" {...register("priceHalfWholesale", { valueAsNumber: true })} className="bg-white border-indigo-200 text-center font-mono" />
                    </div>
                    <div className="space-y-2 text-right">
                        <Label htmlFor="priceSpecial" className="text-purple-700 font-medium text-xs block">{dict.Dialogs.AddProduct.Special}</Label>
                        <Input id="priceSpecial" type="number" step="0.01" {...register("priceSpecial", { valueAsNumber: true })} className="bg-white border-purple-200 text-center font-mono" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 text-right">
                    <Label htmlFor="stockQuantity" className="block">{dict.Dialogs.AddProduct.OpeningStock}</Label>
                    <Input id="stockQuantity" type="number" {...register("stockQuantity", { valueAsNumber: true })} className="font-bold text-center" />
                </div>
                <div className="space-y-2 text-right">
                    <Label htmlFor="minStock" className="block">{dict.Dialogs.AddProduct.MinStock}</Label>
                    <Input id="minStock" type="number" {...register("minStock", { valueAsNumber: true })} className="text-center" placeholder="0" />
                </div>
                <div className="space-y-2 text-right">
                    <Label htmlFor="location" className="block">{dict.Dialogs.AddProduct.Location}</Label>
                    <Input id="location" placeholder={dict.Inventory.ProductForm.ShelfPlaceholder} {...register("location")} className="text-right" />
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 shadow-md">
                {isSubmitting ? (
                    <><RefreshCw className="ml-2 h-5 w-5 animate-spin" /> {dict.Dialogs.AddProduct.Saving}</>
                ) : (
                    <><Package className="ml-2 h-5 w-5" /> {dict.Dialogs.AddProduct.Save}</>
                )}
            </Button>
        </form>
    );
}
