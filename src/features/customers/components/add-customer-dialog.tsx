"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { useState } from "react";
import { toast } from "sonner";
import { createCustomer } from "../actions";
import { Plus } from "lucide-react";
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
import { CreditCard, User, ShieldCheck } from "lucide-react";

import { useTranslation } from "@/components/providers/i18n-provider";

export function AddCustomerDialog({ triggerLabel, representatives = [] }: { triggerLabel?: string, representatives?: any[] }) {
    const [open, setOpen] = useState(false);
    const { dict } = useTranslation();

    const customerSchema = z.object({
        name: z.string().min(2, dict.Customers.AddDialog.Errors.NameRequired),
        companyName: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email(dict.Customers.AddDialog.Errors.InvalidEmail).optional().or(z.literal("")),
        address: z.string().optional(),
        taxId: z.string().optional(),
        nationalId: z.string().optional(),
        creditLimit: z.coerce.number().optional().default(0),
        paymentDay: z.coerce.number().min(1, dict.Customers.AddDialog.Errors.InvalidPaymentDay).max(31, dict.Customers.AddDialog.Errors.InvalidPaymentDay).optional(),
        openingBalance: z.coerce.number().optional().default(0),
        priceLevel: z.enum(['retail', 'wholesale', 'half_wholesale', 'special']),
        representativeId: z.coerce.number().optional().nullable(),
    });

    type CustomerFormValues = z.infer<typeof customerSchema>;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CustomerFormValues>({
        resolver: zodResolver(customerSchema) as any,
        defaultValues: {
            name: "",
            companyName: "",
            phone: "",
            email: "",
            address: "",
            taxId: "",
            nationalId: "",
            creditLimit: 0,
            paymentDay: 1,
            openingBalance: 0,
            priceLevel: 'retail',
            representativeId: null
        }
    });

    const onSubmit = async (data: CustomerFormValues) => {
        const res = await createCustomer(data);
        if (res.success) {
            toast.success(dict.Customers.AddDialog.Success);
            reset();
            setOpen(false);
            window.location.reload();
        } else {
            toast.error(res.message || dict.Customers.AddDialog.Error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="flex items-center justify-center gap-2 h-10 bg-blue-600 hover:bg-blue-700">
                    <Plus size={16} />
                    {triggerLabel || dict.Customers.AddDialog.Button}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-right">{dict.Customers.AddDialog.Title}</DialogTitle>
                    <DialogDescription className="text-right">
                        {dict.Customers.AddDialog.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4 py-2">
                    <Tabs defaultValue="basic" className="w-full">
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
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.Name} *</Label>
                                <Input {...register("name")} placeholder={dict.Customers?.AddDialog?.Placeholders?.Name} className="text-right" />
                                {errors.name && <p className="text-red-500 text-xs text-right">{errors.name.message as string}</p>}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.Phone}</Label>
                                    <Input {...register("phone")} dir="ltr" className="text-center" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.OpeningBalance}</Label>
                                    <Input type="number" step="0.01" {...register("openingBalance")} dir="ltr" className="text-center font-mono" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.Address}</Label>
                                <Input {...register("address")} placeholder={dict.Customers?.AddDialog?.Placeholders?.Address} className="text-right" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.PriceLevel}</Label>
                                <Select onValueChange={(val: any) => setValue("priceLevel", val)} defaultValue="retail">
                                    <SelectTrigger className="text-right">
                                        <SelectValue placeholder={dict.Customers?.AddDialog?.PriceLevelPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent className="text-right">
                                        <SelectItem value="retail">{dict.Customers.AddDialog.Retail}</SelectItem>
                                        <SelectItem value="wholesale">{dict.Customers.AddDialog.Wholesale}</SelectItem>
                                        <SelectItem value="half_wholesale">{dict.Customers.AddDialog.HalfWholesale}</SelectItem>
                                        <SelectItem value="special">{dict.Customers.AddDialog.Special}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.Representative}</Label>
                                <Select onValueChange={(val) => setValue("representativeId", parseInt(val))}>
                                    <SelectTrigger className="text-right">
                                        <SelectValue placeholder={dict.Customers?.AddDialog?.SearchPlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent className="text-right">
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
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.Company}</Label>
                                <Input {...register("companyName")} placeholder={dict.Customers?.AddDialog?.Placeholders?.Company} className="text-right" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.TaxId}</Label>
                                    <Input {...register("taxId")} dir="ltr" className="text-center font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.NationalId}</Label>
                                    <Input {...register("nationalId")} placeholder={dict.Customers?.AddDialog?.Placeholders?.NationalId} dir="ltr" className="text-center font-mono" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.CreditLimit}</Label>
                                    <Input type="number" {...register("creditLimit")} dir="ltr" className="text-center font-mono" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-right block w-full">{dict.Customers.AddDialog.PaymentDay}</Label>
                                    <Input type="number" min="1" max="31" {...register("paymentDay")} placeholder={dict.Customers?.AddDialog?.Placeholders?.PaymentDay} dir="ltr" className="text-center" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-right block w-full">{dict.Customers.AddDialog.Email}</Label>
                                <Input {...register("email")} dir="ltr" className="text-center" placeholder={dict.Customers?.AddDialog?.Placeholders?.Email} />
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="mt-6 flex flex-row-reverse gap-2">
                        <Button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700">
                            {isSubmitting ? dict.Customers.AddDialog.Saving : dict.Customers.AddDialog.Save}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
