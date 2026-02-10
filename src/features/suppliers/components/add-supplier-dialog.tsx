"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { PlusCircle, Loader2 } from "lucide-react";
import { createSupplier } from "../actions";
import { toast } from "sonner";
import { TranslationKeys } from "@/lib/translation-types";
import { useTranslation } from "@/components/providers/i18n-provider";

export function AddSupplierDialog() {
    const { dict } = useTranslation() as { dict: TranslationKeys };
    const [open, setOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const supplierSchema = z.object({
        name: z.string().min(1, dict.Suppliers.AddDialog.Errors.NameRequired),
        companyName: z.string().optional(),
        email: z.string().email(dict.Suppliers.AddDialog.Errors.InvalidEmail).optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        openingBalance: z.coerce.number().optional().default(0),
    });

    type SupplierFormValues = z.infer<typeof supplierSchema>;

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema) as any,
        defaultValues: {
            name: "",
            companyName: "",
            email: "",
            phone: "",
            address: "",
            taxId: "",
            openingBalance: 0,
        },
    });

    async function onSubmit(data: SupplierFormValues) {
        startTransition(async () => {
            const result = await createSupplier(data);
            if (result.success) {
                toast.success(dict.Suppliers.AddDialog.Success);
                setOpen(false);
                form.reset();
                window.location.reload();
            } else {
                toast.error(result.message || dict.Common.Error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2">
                    <PlusCircle size={16} />
                    {dict.Suppliers.AddDialog.Button}
                </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{dict.Suppliers.AddDialog.Title}</DialogTitle>
                    <DialogDescription className="text-right">
                        {dict.Suppliers.AddDialog.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Name} <span className="text-red-500">*</span></Label>
                            <Input {...form.register("name")} placeholder={dict.Suppliers?.AddDialog?.Placeholders?.Name} className="text-right" />
                            {form.formState.errors.name && (
                                <p className="text-sm text-red-500 text-right">{form.formState.errors.name.message}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Company}</Label>
                            <Input {...form.register("companyName")} placeholder={dict.Suppliers.AddDialog.Placeholders.Company} className="text-right" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Phone}</Label>
                            <Input {...form.register("phone")} placeholder={dict.Suppliers.AddDialog.Placeholders.Phone} dir="ltr" className="text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.TaxId}</Label>
                            <Input {...form.register("taxId")} className="text-center font-mono" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.OpeningBalance}</Label>
                            <Input type="number" step="0.01" {...form.register("openingBalance")} className="text-center font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Email}</Label>
                            <Input {...form.register("email")} type="email" dir="ltr" className="text-center" />
                            {form.formState.errors.email && (
                                <p className="text-sm text-red-500 text-right">{form.formState.errors.email.message}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Address}</Label>
                        <Input {...form.register("address")} className="text-right" />
                    </div>

                    <DialogFooter className="pt-4 flex flex-row-reverse justify-start gap-2">
                        <Button type="submit" disabled={isPending} className="flex-1 md:flex-none">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {dict.Suppliers.AddDialog.Save}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1 md:flex-none">
                            {dict.Common.Cancel}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
