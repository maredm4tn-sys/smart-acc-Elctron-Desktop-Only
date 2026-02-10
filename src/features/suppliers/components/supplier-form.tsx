"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { createSupplier } from "../actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useRouter } from "next/navigation";

import { TranslationKeys } from "@/lib/translation-types";

export function SupplierForm({ dict }: { dict: TranslationKeys }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const schema = z.object({
        name: z.string().min(1, dict.Suppliers.AddDialog.Errors.NameRequired),
        companyName: z.string().optional(),
        email: z.string().email(dict.Suppliers.AddDialog.Errors.InvalidEmail).optional().or(z.literal("")),
        phone: z.string().optional(),
        address: z.string().optional(),
        taxId: z.string().optional(),
        openingBalance: z.coerce.number().optional().default(0),
    });

    type SupplierFormValues = z.infer<typeof schema>;

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(schema) as any,
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
                router.push("/dashboard/suppliers");
            } else {
                toast.error(result.message || dict.Common.Error);
            }
        });
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4" dir={dict.Common.Direction as any}>
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

            <Button type="submit" disabled={isPending} className="w-full h-11 text-lg font-bold bg-blue-600 hover:bg-blue-700">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {dict.Suppliers.AddDialog.Save}
            </Button>
        </form>
    );
}
