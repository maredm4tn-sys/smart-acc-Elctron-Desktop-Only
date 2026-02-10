"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { createCustomer } from "../actions";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { User, ShieldCheck } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";

export function CustomerForm({ representatives = [] }: { representatives?: any[] }) {
    const { dict } = useTranslation();
    const router = useRouter();

    const customerSchema = z.object({
        name: z.string().min(2, dict.Customers.AddDialog.Errors.NameRequired),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email(dict.Customers.AddDialog.Errors.InvalidEmail).optional().or(z.literal('')),
        address: z.string().optional(),
        taxId: z.string().optional(),
        nationalId: z.string().optional(),
        creditLimit: z.coerce.number().optional().default(0),
        paymentDay: z.coerce.number().min(1).max(31, dict.Customers.AddDialog.Errors.InvalidPaymentDay).optional(),
        openingBalance: z.coerce.number().optional().default(0),
        priceLevel: z.enum(['retail', 'wholesale', 'half_wholesale', 'special']),
        representativeId: z.coerce.number().optional().nullable(),
    });

    type CustomerFormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema),
        defaultValues: {
            name: "",
            companyName: "",
            phone: "",
            email: "",
            address: "",
            taxId: "",
            nationalId: "",
            creditLimit: 0,
            paymentDay: undefined,
            openingBalance: 0,
            priceLevel: 'retail' as 'retail' | 'wholesale' | 'half_wholesale' | 'special',
            representativeId: null
        }
    });

    const onSubmit = async (data: CustomerFormValues) => {
        const res = await createCustomer(data);
        if (res.success) {
            toast.success(dict.Customers.AddDialog.Success);
            router.push("/dashboard/customers");
        } else {
            toast.error(res.message || dict.Customers.AddDialog.Error);
        }
    };

    return (

        <form onSubmit={handleSubmit(onSubmit, (e) => toast.error(dict.Common.Error))} className="space-y-4 py-2">
            <Tabs defaultValue="basic" className="w-full" dir={dict.Common.Direction as any}>
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="basic" className="flex items-center gap-2">
                        <User size={14} />
                        {dict.Customers.AddDialog.BasicInfo}
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex items-center gap-2">
                        <ShieldCheck size={14} />
                        {dict.Customers.AddDialog.AdditionalInfo}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.Name}</Label>
                        <Input {...register("name")} placeholder={dict.Customers.AddDialog.Placeholders.Name} />
                        {errors.name && <p className="text-red-500 text-xs">{errors.name.message as string}</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Customers.AddDialog.Phone}</Label>
                            <Input {...register("phone")} className="dir-ltr text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Customers.AddDialog.OpeningBalance}</Label>
                            <Input type="number" step="0.01" {...register("openingBalance")} className="dir-ltr text-center" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.Address}</Label>
                        <Input {...register("address")} />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.PriceLevel}</Label>
                        <Select onValueChange={(val: any) => setValue("priceLevel", val)} defaultValue="retail">
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Customers.AddDialog.PriceLevelPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="retail">{dict.Customers.AddDialog.Retail}</SelectItem>
                                <SelectItem value="wholesale">{dict.Customers.AddDialog.Wholesale}</SelectItem>
                                <SelectItem value="half_wholesale">{dict.Customers.AddDialog.HalfWholesale}</SelectItem>
                                <SelectItem value="special">{dict.Customers.AddDialog.Special}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.Representative}</Label>
                        <Select onValueChange={(val) => setValue("representativeId", parseInt(val))}>
                            <SelectTrigger>
                                <SelectValue placeholder={dict.Customers.AddDialog.SearchPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {representatives?.length > 0 && representatives.map((rep) => (
                                    <SelectItem key={rep?.id} value={rep?.id?.toString() || ""}>
                                        {rep?.name || dict.Common.NA}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4 mt-4">
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.Company}</Label>
                        <Input {...register("companyName")} placeholder={dict.Customers.AddDialog.Placeholders.Company} />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.TaxId}</Label>
                        <Input {...register("taxId")} className="dir-ltr text-center" />
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.NationalId}</Label>
                        <Input {...register("nationalId")} placeholder={dict.Customers.AddDialog.Placeholders.NationalId} className="dir-ltr text-center" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>{dict.Customers.AddDialog.CreditLimit}</Label>
                            <Input type="number" {...register("creditLimit")} className="dir-ltr text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label>{dict.Customers.AddDialog.PaymentDay}</Label>
                            <Input type="number" min="1" max="31" {...register("paymentDay")} placeholder={dict.Customers.AddDialog.Placeholders.PaymentDay} className="dir-ltr text-center" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>{dict.Customers.AddDialog.Email}</Label>
                        <Input {...register("email")} className="dir-ltr text-center" placeholder={dict.Customers.AddDialog.Placeholders.Email} />
                    </div>
                </TabsContent>
            </Tabs>

            <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-lg font-bold">
                {isSubmitting ? dict.Customers.AddDialog.Saving : dict.Customers.AddDialog.Save}
            </Button>
        </form>
    );
}
