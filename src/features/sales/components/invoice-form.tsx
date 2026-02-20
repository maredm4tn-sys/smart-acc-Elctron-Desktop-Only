"use client";

import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Plus, Save, Printer } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { createInvoice } from "../actions";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSWRConfig } from "swr";
import { formatCurrency } from "@/lib/utils";
import { useSettings } from "@/components/providers/settings-provider";
import { ProductCombobox } from "./product-combobox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CustomerCombobox } from "@/features/pos/components/customer-combobox";

interface ProductOption { id: number; name: string; price: number; sku: string; }
interface CustomerOption { id: number; name: string; }
interface RepresentativeOption { id: number; name: string; type: "sales" | "delivery"; }

export function InvoiceForm({ products, customers, representatives = [], settings }: {
    products: ProductOption[],
    customers: CustomerOption[],
    representatives?: RepresentativeOption[],
    settings?: any
}) {
    const { dict: rawDict, dir } = useTranslation() as any;
    const dict = rawDict;
    const { currency: globalCurrency } = useSettings();
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const [totals, setTotals] = useState({ subtotal: 0, tax: 0, total: 0 });
    const [autoPrint, setAutoPrint] = useState(true);
    const [printLayout, setPrintLayout] = useState<'standard' | 'thermal'>(settings?.defaultPrintSales || 'standard');
    const printFrameRef = useRef<HTMLIFrameElement>(null);

    const invoiceSchema = z.object({
        customerName: z.string().min(1, dict.Customers.AddDialog.Errors.NameRequired),
        customerId: z.string().optional().default("0"),
        issueDate: z.string().min(1, dict.Sales.Invoice.Form.Errors.DateRequired),
        currency: z.string().min(1, dict.Sales.Invoice.Form.Errors.CurrencyRequired),
        exchangeRate: z.number().min(0.000001, dict.Sales.Invoice.Form.Errors.InvalidRate),
        includeTax: z.boolean().default(false),
        initialPayment: z.number().min(0).default(0),
        discountAmount: z.number().min(0).default(0),
        representativeId: z.number().optional().nullable(),
        dueDate: z.string().optional().nullable(),
        isInstallment: z.boolean().default(false),
        installmentCount: z.number().min(0).default(0),
        installmentInterest: z.number().min(0).default(0),
        items: z.array(z.object({
            productId: z.string().min(1, dict.Sales.Invoice.Form.Errors.ItemRequired),
            description: z.string().optional(),
            quantity: z.number().min(1, dict.Sales.Invoice.Form.Errors.QtyRequired),
            unitPrice: z.number().min(0, dict.Sales.Invoice.Form.Errors.PriceRequired),
        })).min(1, dict.Sales.Invoice.Form.Errors.MinItemRequired)
    });

    const { control, register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<z.infer<typeof invoiceSchema>>({
        resolver: zodResolver(invoiceSchema),
        defaultValues: {
            customerName: dict.POS?.CashCustomer,
            customerId: "0",
            issueDate: new Date(Date.now() - (new Date().getTimezoneOffset() * 60000)).toISOString().split('T')[0],
            currency: globalCurrency || "EGP",
            exchangeRate: 1,
            includeTax: false,
            initialPayment: 0,
            discountAmount: 0,
            isInstallment: false,
            installmentCount: 12,
            installmentInterest: 0,
            dueDate: null,
            items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({ control, name: "items" });
    const watchedItems = useWatch({ control, name: "items" });
    const isInstallment = watch("isInstallment");
    const installmentCount = watch("installmentCount") || 1;
    const installmentInterest = watch("installmentInterest") || 0;
    const includeTax = watch("includeTax");
    const selectedCurrency = watch("currency");
    const initialPayment = watch("initialPayment") || 0;
    const discountAmount = watch("discountAmount") || 0;

    useEffect(() => {
        const items = watchedItems || [];
        const sub = items.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
        const taxRate = (settings?.taxRate || 14) / 100;
        const tax = includeTax ? sub * taxRate : 0;
        let total = (sub + tax) - discountAmount;
        if (isInstallment && installmentInterest > 0) total = total + (total * (installmentInterest / 100));
        setTotals({ subtotal: sub, tax, total });
    }, [watchedItems, includeTax, isInstallment, installmentInterest, discountAmount, settings?.taxRate]);

    useEffect(() => {
        const currentName = watch("customerName");
        const isDefault = !currentName || currentName === dict.POS?.CashCustomer;
        if (isDefault && dict.POS?.CashCustomer) {
            setValue("customerName", dict.POS.CashCustomer);
        }
    }, [dict, setValue, watch]);

    useEffect(() => {
        if (!isInstallment) setValue("initialPayment", Number(totals.total.toFixed(2)), { shouldValidate: true });
    }, [totals.total, setValue, isInstallment]);

    const onProductChange = (index: number, productId: string) => {
        const prod = products.find(p => p.id.toString() === productId);
        if (prod) {
            setValue(`items.${index}.description` as const, prod.name, { shouldValidate: true });
            setValue(`items.${index}.unitPrice` as const, prod.price, { shouldValidate: true });
        }
    };

    const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const sku = e.currentTarget.value.trim();
            const product = products.find(p => p.sku === sku);
            if (product) {
                const lastIdx = watchedItems.length - 1;
                if (!watchedItems[lastIdx].productId && !watchedItems[lastIdx].description) {
                    setValue(`items.${lastIdx}.productId`, product.id.toString(), { shouldValidate: true });
                    setValue(`items.${lastIdx}.description`, product.name, { shouldValidate: true });
                    setValue(`items.${lastIdx}.unitPrice`, product.price, { shouldValidate: true });
                } else {
                    append({ productId: product.id.toString(), description: product.name, unitPrice: product.price, quantity: 1 });
                }
                toast.success((dict.Common?.Success) + ": " + product.name);
                e.currentTarget.value = "";
            } else {
                toast.error(dict.Common?.Error);
            }
        }
    };

    const [createdInvoiceId, setCreatedInvoiceId] = useState<number | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F2') { e.preventDefault(); handleSubmit(onSubmit)(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSubmit]);

    const onSubmit = async (data: z.infer<typeof invoiceSchema>) => {
        try {
            const res = await createInvoice({
                ...data,
                items: data.items.map(i => ({ productId: parseInt(i.productId), description: i.description || "", quantity: i.quantity, unitPrice: i.unitPrice }))
            });
            if (res && res.success) {
                toast.success(res.message || (dict.Common?.Success));
                if (res.id) {
                    setCreatedInvoiceId(res.id);
                    if (autoPrint) {
                        const printUrl = `/print/sales/${res.id}?type=${printLayout}&auto=true&t=${Date.now()}`;
                        window.open(printUrl, '_blank', 'width=800,height=900');
                    }
                }
                mutate('invoices-list');
                mutate('dashboard-stats');
                setTimeout(() => {
                    reset({
                        customerName: dict.Common?.CashCustomer,
                        issueDate: new Date().toISOString().split('T')[0],
                        currency: globalCurrency || "EGP",
                        exchangeRate: 1,
                        includeTax: false,
                        initialPayment: 0,
                        discountAmount: 0,
                        dueDate: null,
                        items: [{ productId: "", description: "", quantity: 1, unitPrice: 0 }]
                    });
                    setCreatedInvoiceId(null);
                }, 2000);
            } else {
                toast.error(res?.message || (dict.Common?.Error));
            }
        } catch (e: any) {
            toast.error(e.message );
        }
    };

    return (
        <div className="space-y-6" dir={dir}>
            <Card className="bg-blue-50/50 border-blue-100">
                <CardContent className="p-4 flex items-center gap-4">
                    <div className="flex-1">
                        <label className="text-sm font-semibold text-blue-700 mb-1 block">
                            🔍 {dict.Sales?.Invoice?.Form?.Table?.Item} (Enter)
                        </label>
                        <Input autoFocus placeholder={dict.Sales?.Invoice?.Form?.SelectProduct} onKeyDown={handleBarcodeScan} className="bg-white" />
                    </div>
                </CardContent>
            </Card>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" dir={dir}>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border p-4 rounded-md bg-gray-50/50">
                    <div className="md:col-span-2">
                        <label className="text-sm font-medium mb-1 block">{dict.Sales?.Invoice?.Form?.Customer}</label>
                        <CustomerCombobox
                            customers={customers}
                            defaultValue={watch("customerId")}
                            onSelect={(c) => {
                                const val = c.id.toString();
                                setValue("customerId", val);
                                if (val !== "0") setValue("customerName", c.name);
                                else setValue("customerName", dict.Common?.CashCustomer);
                            }}
                            placeholder={dict.Sales?.Invoice?.Form?.SelectCustomer}
                        />
                        {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName.message}</p>}
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block">{dict.Sales?.Invoice?.Form?.IssueDate}</label>
                        <Input type="date" {...register("issueDate")} />
                    </div>

                    <div>
                        <label className="text-sm font-medium mb-1 block">{dict.Representatives?.MenuLabel}</label>
                        <Select onValueChange={(val) => setValue("representativeId", parseInt(val))} defaultValue={watch("representativeId")?.toString()}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder={dict.Representatives?.SearchPlaceholder} />
                            </SelectTrigger>
                            <SelectContent>
                                {representatives.map(rep => <SelectItem key={rep.id} value={rep.id.toString()}>{rep.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Currency selection removed as per user request to use system default */}
                    {watch("currency") !== 'EGP' && globalCurrency !== 'EGP' && (
                        <div>
                            <label className="text-sm font-medium mb-1 block">{dict.Sales?.Invoice?.Form?.ExchangeRate}</label>
                            <Input type="number" step="0.000001" {...register("exchangeRate", { valueAsNumber: true })} />
                        </div>
                    )}
                    {settings?.taxEnabled && (
                        <div className="flex flex-col gap-2 pt-2">
                            <div className="flex items-center gap-2">
                                <input type="checkbox" id="includeTax" className="h-4 w-4" {...register("includeTax")} />
                                <label htmlFor="includeTax" className="text-sm font-medium">{dict.Sales?.Invoice?.Form?.IncludeTax}</label>
                            </div>
                        </div>
                    )}
                    <div className="flex flex-col gap-2 pt-6">
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="isInstallment" className="h-5 w-5 accent-orange-500" {...register("isInstallment")} />
                            <label htmlFor="isInstallment" className="text-sm font-bold text-orange-600">💳 {dict.Sales?.Invoice?.Form?.IsInstallment}</label>
                        </div>
                    </div>
                </div>

                {isInstallment && (
                    <div className="bg-orange-50 border border-orange-200 p-4 rounded-md grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm font-bold text-orange-800 mb-1 block">{dict.Sales?.Invoice?.Form?.InstallmentMonths}</label>
                            <Input type="number" {...register("installmentCount", { valueAsNumber: true })} min="1" />
                        </div>
                        <div>
                            <label className="text-sm font-bold text-orange-800 mb-1 block">{dict.Sales?.Invoice?.Form?.InstallmentInterest}</label>
                            <Input type="number" step="0.1" {...register("installmentInterest", { valueAsNumber: true })} min="0" />
                        </div>
                        <div className="bg-white p-2 rounded border border-orange-200 flex flex-col items-center justify-center">
                            <span className="text-xs text-orange-600 font-bold">{dict.Sales?.Invoice?.Form?.ExpectedMonthlyInstallment}</span>
                            <span className="text-xl font-black text-orange-700">{((totals.total - initialPayment) / (installmentCount || 1)).toFixed(2)}</span>
                        </div>
                    </div>
                )}

                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[30%]">{dict.Sales?.Invoice?.Form?.Table?.Item}</TableHead>
                                <TableHead className="w-[30%]">{dict.Sales?.Invoice?.Form?.Table?.Description}</TableHead>
                                <TableHead className="w-[10%]">{dict.Sales?.Invoice?.Form?.Table?.Qty}</TableHead>
                                <TableHead className="w-[15%]">{dict.Sales?.Invoice?.Form?.Table?.Price}</TableHead>
                                <TableHead className="w-[10%]">{dict.Sales?.Invoice?.Form?.Table?.Total}</TableHead>
                                <TableHead className="w-[5%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id}>
                                    <TableCell className="p-2">
                                        <ProductCombobox
                                            products={products}
                                            value={watchedItems[index]?.productId}
                                            onSelect={(val) => { setValue(`items.${index}.productId`, val, { shouldValidate: true }); onProductChange(index, val); }}
                                            placeholder={dict.Sales?.Invoice?.Form?.SelectProduct}
                                        />
                                    </TableCell>
                                    <TableCell className="p-2"><Input {...register(`items.${index}.description` as const)} /></TableCell>
                                    <TableCell className="p-2"><Input type="number" min="1" {...register(`items.${index}.quantity` as const, { valueAsNumber: true })} /></TableCell>
                                    <TableCell className="p-2"><Input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })} /></TableCell>
                                    <TableCell className="p-2 font-medium">{((watchedItems[index]?.quantity || 0) * (watchedItems[index]?.unitPrice || 0)).toFixed(2)}</TableCell>
                                    <TableCell className="p-2 text-center"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500"><Trash2 size={16} /></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>

                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <Button type="button" variant="outline" onClick={() => append({ productId: "", description: "", quantity: 1, unitPrice: 0 })} className="gap-2">
                        <Plus size={16} /><span>{dict.Sales?.Invoice?.Form?.AddItem}</span>
                    </Button>
                    <div className="w-full md:w-80 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg border space-y-2">
                            <div className="flex justify-between text-sm"><span>{dict.Sales?.Invoice?.Form?.Subtotal}:</span><span className="font-mono">{formatCurrency(totals.subtotal, watch("currency"))}</span></div>
                            <div className="flex justify-between items-center text-sm text-red-600 gap-4 mt-1">
                                <span>{dict.Sales?.Invoice?.Form?.DiscountAmount}:</span>
                                <div className="flex items-center gap-2 w-32">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...register("discountAmount", { valueAsNumber: true })}
                                        className="h-8 text-xs text-right bg-white border-red-200 focus-visible:ring-red-500"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2"><span>{dict.Sales?.Invoice?.Form?.GrandTotal}:</span><span className="text-primary font-mono text-xl">{formatCurrency(totals.total, watch("currency"))}</span></div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 shadow-sm relative overflow-hidden">
                            {(totals.total - initialPayment) > 0.1 && !isInstallment && (
                                <div className="absolute top-0 right-0 bg-red-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl">{dict.Sales?.Invoice?.Form?.CreditSaleTag}</div>
                            )}
                            <label className="text-sm font-bold text-blue-900 mb-1 block">{dict.Sales?.Invoice?.Form?.PaidAmount}</label>
                            <Input type="number" step="0.01" {...register("initialPayment", { valueAsNumber: true })} className="bg-white text-lg font-bold text-green-700 h-12" />
                        </div>
                        {(totals.total - initialPayment) > 0.1 && (
                            <Card className="bg-rose-50 border-rose-200">
                                <CardContent className="p-4 space-y-3">
                                    <label className="text-sm font-bold text-amber-900 block">📅 {dict.Sales?.Invoice?.Form?.DueDate}</label>
                                    <Input type="date" {...register("dueDate")} />
                                    <div className="grid grid-cols-3 gap-2">
                                        {[7, 14, 30].map(days => (
                                            <Button key={days} type="button" variant="outline" size="sm" className="text-[10px] h-7" onClick={() => { const d = new Date(); d.setDate(d.getDate() + days); setValue("dueDate", d.toISOString().split('T')[0]); }}>
                                                +{days} {dict.Common?.Days?.[days as unknown as keyof typeof dict.Common.Days] || "Days"}
                                            </Button>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>

                <div className="flex justify-end items-center gap-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase text-center block mb-1">{dict.Sales?.Invoice?.Form?.PrintLayout}</label>
                        <Tabs value={printLayout} onValueChange={(v: any) => setPrintLayout(v)} className="w-32">
                            <TabsList className="grid grid-cols-2 h-8 w-full"><TabsTrigger value="standard" className="text-[10px] font-bold">A4</TabsTrigger><TabsTrigger value="thermal" className="text-[10px] font-bold">📠</TabsTrigger></TabsList>
                        </Tabs>
                    </div>
                    <div className="flex items-center gap-2">
                        <Checkbox id="auto-print-invoice" checked={autoPrint} onCheckedChange={(val) => setAutoPrint(val as boolean)} />
                        <Label htmlFor="auto-print-invoice" className="font-bold text-slate-600 cursor-pointer">{dict.Sales?.Invoice?.Form?.AutoPrint}</Label>
                    </div>
                    <Button type="submit" size="lg" className="gap-2 min-w-[150px]" disabled={isSubmitting}><Save size={18} /><span>{dict.Sales?.Invoice?.Form?.Submit} (F2)</span></Button>
                </div>
                <iframe ref={printFrameRef} name="invoice_print_frame" title="Invoice Printing" className="fixed -right-[1000px] -bottom-[1000px] w-[10px] h-[10px] opacity-0" />
            </form>
        </div>
    );
}
