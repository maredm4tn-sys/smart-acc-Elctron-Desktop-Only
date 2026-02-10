"use client";

import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash, FileText } from "lucide-react";
import { deleteSupplier, updateSupplier } from "../actions";
import { toast } from "sonner";
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
import { useForm, SubmitHandler } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { TranslationKeys } from "@/lib/translation-types";

export function SupplierActions({ supplier, dict }: { supplier: any, dict: TranslationKeys }) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = () => {
        if (confirm(dict.Dialogs.DeleteConfirm)) {
            startTransition(async () => {
                const res = await deleteSupplier(supplier.id);
                if (res.success) {
                    toast.success(dict.Common.DeleteSuccess);
                    window.location.reload();
                }
                else toast.error(dict.Common.DeleteError);
            });
        }
    };

    return (
        <>
            <div className="flex items-center gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                    onClick={() => setEditOpen(true)}
                    title={dict.Suppliers.Table.Edit}
                >
                    <Pencil className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-600 hover:bg-slate-100"
                    onClick={() => window.location.href = `/dashboard/suppliers/${supplier.id}`}
                    title={dict.Suppliers.Statement.Title}
                >
                    <FileText className="h-4 w-4" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                    onClick={handleDelete}
                    title={dict.Suppliers.Table.Delete}
                >
                    <Trash className="h-4 w-4" />
                </Button>
            </div>

            <EditSupplierDialog open={editOpen} setOpen={setEditOpen} supplier={supplier} dict={dict} />
        </>
    );
}

function EditSupplierDialog({ open, setOpen, supplier, dict }: { open: boolean, setOpen: (v: boolean) => void, supplier: any, dict: any }) {
    const [isPending, startTransition] = useTransition();

    const supplierSchema = z.object({
        name: z.string().min(1, dict.Suppliers.AddDialog.Errors.NameRequired),
        companyName: z.string().optional().nullable(),
        email: z.string().email(dict.Suppliers.AddDialog.Errors.InvalidEmail).optional().nullable().or(z.literal("")),
        phone: z.string().optional().nullable(),
        address: z.string().optional().nullable(),
        taxId: z.string().optional().nullable(),
        openingBalance: z.coerce.number().default(0),
    });

    type SupplierFormValues = z.infer<typeof supplierSchema>;

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema) as any,
        defaultValues: {
            name: supplier.name,
            companyName: supplier.companyName || "",
            email: supplier.email || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            taxId: supplier.taxId || "",
            openingBalance: Number(supplier.openingBalance) || 0,
        },
    });

    const onSubmit: SubmitHandler<SupplierFormValues> = async (data) => {
        startTransition(async () => {
            const result = await updateSupplier(supplier.id, data);
            if (result.success) {
                toast.success(dict.Suppliers.EditDialog.Success);
                setOpen(false);
                window.location.reload();
            } else {
                toast.error(result.message || dict.Common.Error);
            }
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-right">{dict.Suppliers.EditDialog.Title}</DialogTitle>
                    <DialogDescription className="text-right">
                        {dict.Suppliers.EditDialog.Description}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Name} *</Label>
                            <Input {...form.register("name")} className="text-right" />
                            {form.formState.errors.name && <p className="text-red-500 text-sm text-right">{form.formState.errors.name.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Company}</Label>
                            <Input {...form.register("companyName")} className="text-right" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Phone}</Label>
                            <Input {...form.register("phone")} dir="ltr" className="text-center" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.TaxId}</Label>
                            <Input {...form.register("taxId")} className="text-center font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.OpeningBalance}</Label>
                            <Input type="number" step="0.01" {...form.register("openingBalance")} dir="ltr" className="text-center font-mono" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Email}</Label>
                            <Input {...form.register("email")} type="email" dir="ltr" className="text-center" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-right w-full block">{dict.Suppliers.AddDialog.Address}</Label>
                        <Input {...form.register("address")} className="text-right" />
                    </div>
                    <DialogFooter className="pt-4 flex flex-row-reverse justify-start gap-2">
                        <Button type="submit" disabled={isPending} className="flex-1 md:flex-none bg-blue-600 hover:bg-blue-700">
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
