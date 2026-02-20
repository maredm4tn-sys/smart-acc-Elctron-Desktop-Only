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
import { useState } from "react";
import { createProduct, getCategories } from "../actions";
import { getWarehouses } from "../warehouse-actions";
import { PlusCircle, Package, RefreshCw } from "lucide-react";
import { CategoryManagerDialog } from "./category-manager-dialog";
import { AddUnitDialog } from "./add-unit-dialog";
import { useEffect } from "react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddProductDialog({ triggerLabel }: { triggerLabel?: string }) {
    const [open, setOpen] = useState(false);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [units, setUnits] = useState<{ id: number; name: string }[]>([]); // Units State
    const [warehouses, setWarehouses] = useState<{ id: number; name: string; isDefault: boolean }[]>([]);
    const { dict } = useTranslation() as any;

    const fetchCategories = async () => {
        const cats = await getCategories();
        setCategories(cats);
    };

    const fetchUnits = async () => {
        const { getUnits } = await import("../actions"); // Dynamic import to avoid cycles if any
        const u = await getUnits();
        setUnits(u);
    };

    const fetchWarehouses = async () => {
        const whs = await getWarehouses();
        setWarehouses(whs);
    };

    useEffect(() => {
        if (open) {
            fetchCategories();
            fetchUnits();
            fetchWarehouses();
        }
    }, [open]);

    const productSchema = z.object({
        name: z.string().min(2, dict.Dialogs.AddProduct.Errors.NameRequired),
        sku: z.string().min(1, dict.Dialogs.AddProduct.Errors.SKURequired),
        barcode: z.string().optional(),
        type: z.enum(["goods", "service"]),
        sellPrice: z.coerce.number().min(0),
        priceWholesale: z.coerce.number().min(0).default(0),
        priceHalfWholesale: z.coerce.number().min(0).default(0),
        priceSpecial: z.coerce.number().min(0).default(0),
        buyPrice: z.coerce.number().min(0).default(0),
        stockQuantity: z.coerce.number().min(0).default(0),
        minStock: z.coerce.number().min(0).default(0),
        location: z.string().optional(),
        requiresToken: z.boolean().default(false),
        categoryId: z.number().optional(),
        unitId: z.number().optional(),
        warehouseId: z.number().optional(),
    });

    type ProductFormValues = z.infer<typeof productSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<ProductFormValues>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: "",
            sku: "",
            barcode: "",
            type: "goods",
            sellPrice: 0,
            priceWholesale: 0,
            priceHalfWholesale: 0,
            priceSpecial: 0,
            buyPrice: 0,
            stockQuantity: 0,
            minStock: 0,
            requiresToken: false,
            location: "",
        } as any,
    });

    const onSubmit = async (data: ProductFormValues) => {
        // ... (Keep existing offline/online logic) ...
        // --- Offline Handling ---
        if (!navigator.onLine) {
            try {
                const { queueAction } = await import("@/lib/offline-db");
                await queueAction('CREATE_PRODUCT', {
                    ...data,
                    tenantId: "", // Will be filled by server on sync
                });
                const offlineMsg = dict.Common.Offline.OfflineSaved;
                toast.success(offlineMsg);
                setOpen(false);
                reset();
                return;
            } catch (e) {
                toast.error(dict.Common.Error);
                return;
            }
        }

        try {
            const response = await createProduct({
                ...data,
                tenantId: "", // Let server resolve it
            });

            if (response.success) {
                toast.success(response.message || dict.Common.Success);
                setOpen(false);
                reset();
            } else {
                // Safely check for field property (Type Guard)
                if ('field' in response && response.field === "sku") {
                    setError("sku", { message: response.message });
                } else {
                    toast.error(dict.Common.Error);
                }
            }
        } catch (error) {
            console.error("Submission error:", error);
            toast.error(dict.Common.Error);
        }
    };

    const generateSKU = () => {
        const random = String(Math.floor(100000 + Math.random() * 900000));
        setValue("sku", random);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 text-white border-0">
                    <PlusCircle size={18} />
                    <span className="font-bold">{triggerLabel || dict.Dialogs.AddProduct.Title}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-100 p-2 rounded-lg"><Package className="h-6 w-6 text-indigo-600" /></div>
                        <div>
                            <DialogTitle className="text-xl">{dict.Dialogs.AddProduct.Title}</DialogTitle>
                            <DialogDescription>{dict.Dialogs.AddProduct.Description}</DialogDescription>
                        </div>
                    </div>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">

                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                        <div className="md:col-span-6 space-y-2">
                            <Label htmlFor="name" className="text-base text-right w-full block">{dict.Dialogs.AddProduct.Name} <span className="text-red-500">*</span></Label>
                            <Input id="name" placeholder={dict.Dialogs.AddProduct.Name} {...register("name")} className="h-10 text-right" />
                            {errors.name && <p className="text-sm text-red-500 text-right">{errors.name.message}</p>}
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <Label htmlFor="sku" className="text-right w-full block">{dict.Dialogs.AddProduct.SKU} <span className="text-red-500">*</span></Label>
                            <div className="flex">
                                <Input id="sku" placeholder={dict.Common.Auto} {...register("sku")} className="h-10 rounded-e-none border-e-0 text-center font-mono" />
                                <Button type="button" variant="outline" size="icon" onClick={generateSKU} title={dict.Inventory.ProductForm.GenerateSKU} className="h-10 w-10 rounded-s-none border-s bg-slate-50 hover:bg-slate-100">
                                    <RefreshCw className="h-4 w-4 text-slate-600" />
                                </Button>
                            </div>
                            {errors.sku && <p className="text-sm text-red-500 text-right">{errors.sku.message}</p>}
                        </div>

                        <div className="md:col-span-3 space-y-2">
                            <Label htmlFor="barcode" className="text-right w-full block">{dict.Dialogs.AddProduct.Barcode}</Label>
                            <Input id="barcode" placeholder={dict.Inventory.ProductForm.Scan} {...register("barcode")} className="h-10 text-center bg-slate-50 border-slate-200" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Dialogs.AddProduct.Category}</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={(val) => setValue("categoryId", Number(val))}>
                                    <SelectTrigger className="bg-white text-right">
                                        <SelectValue placeholder={dict.Dialogs.AddProduct.SelectCategory} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {categories?.length > 0 && categories.map((c) => (
                                            <SelectItem key={c?.id} value={c?.id?.toString() || ""} className="text-right">{c?.name || dict.NA}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <CategoryManagerDialog onCategoryAdded={fetchCategories} trigger={<Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Dialogs.AddProduct.Unit}</Label>
                            <div className="flex gap-2">
                                <Select onValueChange={(val) => setValue("unitId", Number(val))}>
                                    <SelectTrigger className="bg-white text-right">
                                        <SelectValue placeholder={dict.Dialogs.AddProduct.SelectUnit} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {units?.length > 0 && units.map((u) => (
                                            <SelectItem key={u?.id} value={u?.id?.toString() || ""} className="text-right">{u?.name || dict.NA}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <AddUnitDialog onUnitAdded={fetchUnits} trigger={<Button type="button" variant="outline" size="icon" className="shrink-0"><PlusCircle className="h-4 w-4" /></Button>} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Dialogs.AddProduct.Type}</Label>
                            <Select onValueChange={(val: any) => setValue("type", val)} defaultValue="goods">
                                <SelectTrigger className="text-right"> <SelectValue /> </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="goods" className="text-right">{dict.Dialogs.AddProduct.Goods}</SelectItem>
                                    <SelectItem value="service" className="text-right">{dict.Dialogs.AddProduct.Service}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Pricing Section - Colorful */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                        <h4 className="font-semibold text-slate-700 flex items-center gap-2">
                            <span>💰</span> {dict.Dialogs.AddProduct.PricesSection}
                        </h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="buyPrice" className="text-right w-full block text-slate-600 text-xs">{dict.Dialogs.AddProduct.BuyPrice}</Label>
                                <Input id="buyPrice" type="number" step="0.01" {...register("buyPrice", { valueAsNumber: true })} className="bg-white border-slate-300 text-right" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sellPrice" className="text-right w-full block text-green-700 font-bold text-xs">{dict.Dialogs.AddProduct.SellPrice}</Label>
                                <Input id="sellPrice" type="number" step="0.01" {...register("sellPrice", { valueAsNumber: true })} className="bg-white border-green-300 focus:ring-green-500 font-bold text-green-700 text-right" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priceWholesale" className="text-right w-full block text-blue-700 font-medium text-xs">{dict.Dialogs.AddProduct.Wholesale}</Label>
                                <Input id="priceWholesale" type="number" step="0.01" {...register("priceWholesale", { valueAsNumber: true })} className="bg-white border-blue-200 text-right" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="priceHalfWholesale" className="text-right w-full block text-indigo-700 font-medium text-xs">{dict.Dialogs.AddProduct.HalfWholesale}</Label>
                                <Input id="priceHalfWholesale" type="number" step="0.01" {...register("priceHalfWholesale", { valueAsNumber: true })} className="bg-white border-indigo-200 text-right" />
                            </div>
                        </div>
                    </div>

                    {/* Inventory Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="stockQuantity" className="text-right w-full block">{dict.Dialogs.AddProduct.OpeningStock}</Label>
                            <Input id="stockQuantity" type="number" {...register("stockQuantity", { valueAsNumber: true })} className="text-right font-bold" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="minStock" className="text-right w-full block">{dict.Dialogs.AddProduct.MinStock}</Label>
                            <Input id="minStock" type="number" {...register("minStock", { valueAsNumber: true })} className="text-right" placeholder="0" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="location" className="text-right w-full block">{dict.Dialogs.AddProduct.Location}</Label>
                            <Input id="location" placeholder={dict.Inventory.ProductForm.ShelfPlaceholder} {...register("location")} className="text-right" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Inventory?.Warehouses?.Title}</Label>
                            <Select onValueChange={(val) => setValue("warehouseId", Number(val))}>
                                <SelectTrigger className="bg-white text-right">
                                    <SelectValue placeholder={dict.Inventory?.Warehouses?.SelectWarehouse} />
                                </SelectTrigger>
                                <SelectContent>
                                    {warehouses?.length > 0 && warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id.toString()} className="text-right">
                                            {w.name} {w.isDefault ? `(${dict.Inventory?.Warehouses?.Default})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse pt-2">
                        <input type="checkbox" id="requiresToken" {...register("requiresToken")} className="w-4 h-4 accent-blue-600 rounded" />
                        <Label htmlFor="requiresToken" className="cursor-pointer text-sm text-slate-600">
                            {dict.Inventory.Table.RequiresToken}
                        </Label>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{dict.Common.Cancel}</Button>
                        <Button type="submit" disabled={isSubmitting} className="min-w-[120px] bg-green-600 hover:bg-green-700">
                            {isSubmitting ? dict.Dialogs.AddProduct.Saving : dict.Dialogs.AddProduct.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
