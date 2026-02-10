"use client";

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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useState, useRef, useEffect } from "react";
import { updateSettings } from "../actions";
import { Save, Upload, Building2, Phone, MapPin, Receipt, Coins } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function SettingsForm({ initialData }: { initialData: any }) {
    const { dict } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [logoPreview, setLogoPreview] = useState<string | null>(initialData?.logoUrl || null);

    const settingsSchema = z.object({
        name: z.string().min(2, dict.Customers.AddDialog.Errors.NameRequired),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        currency: z.string().min(1, dict.Common.Currency),
        logoUrl: z.string().optional(),
    });

    type SettingsFormValues = z.infer<typeof settingsSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<SettingsFormValues>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            name: initialData?.name || "",
            phone: initialData?.phone || "",
            address: initialData?.address || "",
            taxId: initialData?.taxId || "",
            currency: initialData?.currency || "EGP",
            logoUrl: initialData?.logoUrl || "",
        },
    });

    const watchCurrency = watch("currency");

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setValue("logoUrl", base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const onSubmit = async (data: SettingsFormValues) => {
        try {
            console.log("DEBUG: Submitting Facility Settings...", data);
            const res = await updateSettings({
                ...data,
                tenantId: initialData?.id || "tenant_default"
            });

            if (res.success) {
                toast.success(dict.Settings.Form.SaveSuccess);
                setTimeout(() => window.location.reload(), 1000);
            } else {
                toast.error(res.message);
            }
        } catch (error: any) {
            toast.error(dict.Common.Error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Logo & General */}
                <div className="md:col-span-1 space-y-6">
                    <div className="glass-morphism p-6 rounded-2xl border shadow-lg text-center backdrop-blur-md bg-white/40">
                        <Label className="block mb-4 text-lg font-bold bg-gradient-to-l from-primary to-blue-600 bg-clip-text text-transparent">
                            {dict.Settings.Form.Logo}
                        </Label>
                        <div
                            className="mx-auto w-40 h-40 border-2 border-dashed border-primary/30 rounded-2xl flex items-center justify-center bg-white/50 overflow-hidden cursor-pointer hover:border-primary transition-all duration-300 relative group shadow-inner"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                            ) : (
                                <div className="text-primary flex flex-col items-center">
                                    <Upload size={32} className="mb-2" />
                                    <span className="text-xs font-medium">{dict.Settings.Form.Upload}</span>
                                </div>
                            )}
                        </div>
                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleLogoUpload}
                            title={dict.Settings.Form.Upload}
                        />
                    </div>
                </div>

                {/* Form Fields */}
                <div className="md:col-span-2 space-y-6">
                    <div className="glass-morphism p-8 rounded-2xl border shadow-lg space-y-6 backdrop-blur-md bg-white/40">
                        <h2 className="text-xl font-bold flex items-center gap-3 border-b border-primary/10 pb-4 mb-6">
                            <Building2 size={24} className="text-primary" />
                            {dict.Settings.Form.CompanyDetails}
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="name">{dict.Settings.Form.Name} *</Label>
                                <Input id="name" {...register("name")} className="h-11 rounded-xl" placeholder={dict.Settings.Form.Name} title={dict.Settings.Form.Name} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">{dict.Settings.Form.Phone}</Label>
                                <Input id="phone" {...register("phone")} className="h-11 rounded-xl" placeholder={dict.Settings.Form.Phone} title={dict.Settings.Form.Phone} />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">{dict.Settings.Form.Address}</Label>
                            <Input id="address" {...register("address")} className="h-11 rounded-xl" placeholder={dict.Settings.Form.Address} title={dict.Settings.Form.Address} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="taxId">{dict.Settings.Form.TaxId}</Label>
                                <Input id="taxId" {...register("taxId")} className="h-11 rounded-xl" placeholder={dict.Settings.Form.TaxId} title={dict.Settings.Form.TaxId} />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currency">{dict.Settings.Form.Currency}</Label>
                                <Select
                                    value={watchCurrency || initialData?.currency || "EGP"}
                                    onValueChange={(val) => setValue("currency", val, { shouldDirty: true })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl" title={dict.Settings.Form.Currency}>
                                        <SelectValue placeholder={dict.Settings.Form.Currency} />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="EGP">EGP</SelectItem>
                                        <SelectItem value="SAR">SAR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <Button type="submit" size="lg" className="gap-2 min-w-[180px] h-12 rounded-xl" disabled={isSubmitting}>
                            <Save size={18} />
                            <span>{isSubmitting ? dict.Settings.Form.Saving : dict.Settings.Form.Save}</span>
                        </Button>
                    </div>
                </div>
            </div>
        </form>
    );
}
