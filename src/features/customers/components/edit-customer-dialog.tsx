"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { updateCustomer } from "../actions";

import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { User, ShieldCheck } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { TranslationKeys } from "@/lib/translation-types";

interface EditCustomerDialogProps {
    customer: {
        id: number;
        name: string;
        companyName?: string | null;
        phone?: string | null;
        email?: string | null;
        address?: string | null;
        taxId?: string | null;
        nationalId?: string | null;
        creditLimit?: number | string | null;
        paymentDay?: number | null;
        representativeId?: number | null;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dict: TranslationKeys;
    representatives?: any[];
}

export function EditCustomerDialog({ customer, open, onOpenChange, dict, representatives = [] }: EditCustomerDialogProps) {
    const customerSchema = z.object({
        name: z.string().min(1, dict.Customers?.AddDialog?.Errors?.NameRequired),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        nationalId: z.string().optional(),
        creditLimit: z.coerce.number().optional().default(0),
        paymentDay: z.coerce.number()
            .min(1, dict.Customers?.AddDialog?.Errors?.InvalidPaymentDay)
            .max(31, dict.Customers?.AddDialog?.Errors?.InvalidPaymentDay)
            .optional(),
        representativeId: z.coerce.number().optional().nullable(),
    });

    type FormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, setValue, formState: { isSubmitting, errors } } = useForm<FormValues>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            name: customer?.name || "",
            companyName: customer?.companyName || "",
            phone: customer?.phone || "",
            email: customer?.email || "",
            address: customer?.address || "",
            taxId: customer?.taxId || "",
            nationalId: customer?.nationalId || "",
            creditLimit: Number(customer?.creditLimit) || 0,
            paymentDay: customer?.paymentDay || undefined,
            representativeId: (customer as any)?.representativeId || null,
        }
    });

    // Reset form when customer changes
    useEffect(() => {
        if (open && customer) {
            reset({
                name: customer.name || "",
                companyName: customer.companyName || "",
                phone: customer.phone || "",
                email: customer.email || "",
                address: customer.address || "",
                taxId: customer.taxId || "",
                nationalId: customer.nationalId || "",
                creditLimit: Number(customer.creditLimit) || 0,
                paymentDay: customer.paymentDay || undefined,
                representativeId: (customer as any).representativeId || null,
            });
        }
    }, [customer, open, reset]);

    const onSubmit = async (data: FormValues) => {
        const res = await updateCustomer(customer.id, data);
        if (res.success) {
            toast.success(dict.Customers?.EditDialog?.Success);
            onOpenChange(false);
        } else {
            toast.error(res.message || dict.Customers?.EditDialog?.Error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[450px]">
                <DialogHeader className="text-start">
                    <DialogTitle className="text-2xl font-bold text-slate-800">{dict.Customers?.EditDialog?.Title}</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        {dict.Customers?.EditDialog?.Description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6 pt-2">
                    <Tabs defaultValue="basic" className="w-full" dir={dict.Common.Direction as any}>
                        <TabsList className="grid grid-cols-2 w-full bg-slate-100/50 p-1">
                            <TabsTrigger value="basic" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <User size={16} className="text-blue-600" />
                                {dict.Customers?.AddDialog?.BasicInfo}
                            </TabsTrigger>
                            <TabsTrigger value="advanced" className="gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                                <ShieldCheck size={16} className="text-blue-600" />
                                {dict.Customers?.AddDialog?.AdditionalInfo}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="basic" className="space-y-4 pt-4 animate-in fade-in duration-300">
                            <div className="space-y-2 text-start">
                                <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.Name}</Label>
                                <Input
                                    {...register("name")}
                                    className="bg-slate-50/50"
                                    placeholder={dict.Customers?.AddDialog?.Placeholders?.Name}
                                />
                                {errors.name && <p className="text-red-500 text-xs font-medium">{errors.name.message as string}</p>}
                            </div>

                            <div className="space-y-2 text-start">
                                <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.Company}</Label>
                                <Input
                                    {...register("companyName")}
                                    className="bg-slate-50/50"
                                    placeholder={dict.Customers?.AddDialog?.Placeholders?.Company}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.Phone}</Label>
                                    <Input
                                        {...register("phone")}
                                        dir="ltr"
                                        className="text-center bg-slate-50/50"
                                        placeholder={dict.Customers?.AddDialog?.Placeholders?.Phone}
                                    />
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.Email}</Label>
                                    <Input
                                        {...register("email")}
                                        dir="ltr"
                                        className="text-center bg-slate-50/50"
                                        placeholder={dict.Customers?.AddDialog?.Placeholders?.Email}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 text-start">
                                <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.Address}</Label>
                                <Input
                                    {...register("address")}
                                    className="bg-slate-50/50"
                                    placeholder={dict.Customers?.AddDialog?.Placeholders?.Address}
                                />
                            </div>

                            <div className="space-y-2 text-start">
                                <Label className="text-slate-700 font-semibold">{dict.Sidebar.Representatives}</Label>
                                <Select
                                    onValueChange={(val) => setValue("representativeId", parseInt(val))}
                                    defaultValue={customer?.representativeId?.toString()}
                                >
                                    <SelectTrigger className="bg-slate-50/50">
                                        <SelectValue placeholder={dict.Common.Search} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {representatives?.length > 0 && representatives.map((rep) => (
                                            <SelectItem key={rep?.id} value={rep?.id?.toString() || ""}>
                                                {rep?.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4 pt-4 animate-in fade-in duration-300">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.TaxId}</Label>
                                    <Input
                                        {...register("taxId")}
                                        className="text-center font-mono bg-slate-50/50"
                                        placeholder={dict.Customers?.AddDialog?.Placeholders?.TaxId}
                                    />
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.NationalId}</Label>
                                    <Input
                                        {...register("nationalId")}
                                        className="text-center font-mono bg-slate-50/50"
                                        placeholder={dict.Customers?.AddDialog?.Placeholders?.NationalId}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.CreditLimit}</Label>
                                    <Input
                                        type="number"
                                        {...register("creditLimit")}
                                        className="text-center font-mono bg-slate-50/50"
                                    />
                                </div>
                                <div className="space-y-2 text-start">
                                    <Label className="text-slate-700 font-semibold">{dict.Customers?.AddDialog?.PaymentDay}</Label>
                                    <Input
                                        type="number"
                                        min="1" max="31"
                                        {...register("paymentDay")}
                                        className="text-center font-mono bg-slate-50/50"
                                    />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="flex-row-reverse sm:justify-start gap-2 pt-2 border-t mt-4">
                        <Button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 shadow-md min-w-[100px]"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? dict.Common.Loading : dict.Common.Save}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            {dict.Common.Cancel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

