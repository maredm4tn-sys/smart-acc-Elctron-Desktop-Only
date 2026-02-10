"use client";

import { Button } from "@/components/ui/button";
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
import { updateSettings } from "../actions";
import { Save, Printer, FileText, Zap } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function PrintSettingsForm({ initialData }: { initialData: any }) {
    const { dict } = useTranslation();

    const printSchema = z.object({
        defaultPrintSales: z.enum(['standard', 'thermal']),
        defaultPrintPOS: z.enum(['standard', 'thermal']),
    });

    type PrintFormValues = z.infer<typeof printSchema>;

    const {
        handleSubmit,
        setValue,
        formState: { isSubmitting },
    } = useForm<PrintFormValues>({
        resolver: zodResolver(printSchema),
        defaultValues: {
            defaultPrintSales: (initialData?.defaultPrintSales as any) || "standard",
            defaultPrintPOS: (initialData?.defaultPrintPOS as any) || "thermal",
        },
    });

    const onSubmit = async (data: PrintFormValues) => {
        try {
            const res = await updateSettings({
                ...initialData,
                ...data,
                tenantId: initialData?.id || "uuid",
            });

            if (res.success) {
                toast.success(dict.PrintSettings.SaveSuccess);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Common.Error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-morphism p-8 rounded-2xl border shadow-xl backdrop-blur-md bg-white/40 max-w-3xl mx-auto border-primary/10">
                <div className="flex items-center gap-4 mb-8 border-b border-primary/10 pb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                        <Printer size={32} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{dict.PrintSettings.Title}</h2>
                        <p className="text-sm text-muted-foreground">{dict.PrintSettings.Description}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Default for Sales */}
                    <div className="space-y-4 p-5 rounded-2xl bg-white/50 border border-slate-100 hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                                <FileText size={20} className="text-blue-600" />
                            </div>
                            <Label className="text-base font-bold text-slate-700">{dict.PrintSettings.DefaultSales}</Label>
                        </div>
                        <Select
                            defaultValue={initialData?.defaultPrintSales || "standard"}
                            onValueChange={(val) => setValue("defaultPrintSales", val as any)}
                        >
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/80 focus:ring-primary/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="standard" className="rounded-lg">{dict.PrintSettings.Standard}</SelectItem>
                                <SelectItem value="thermal" className="rounded-lg">{dict.PrintSettings.Thermal}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Default for POS */}
                    <div className="space-y-4 p-5 rounded-2xl bg-white/50 border border-slate-100 hover:border-primary/20 transition-all group">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-50 rounded-lg group-hover:bg-orange-100 transition-colors">
                                <Zap size={20} className="text-orange-600" />
                            </div>
                            <Label className="text-base font-bold text-slate-700">{dict.PrintSettings.DefaultPOS}</Label>
                        </div>
                        <Select
                            defaultValue={initialData?.defaultPrintPOS || "thermal"}
                            onValueChange={(val) => setValue("defaultPrintPOS", val as any)}
                        >
                            <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white/80 focus:ring-primary/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="standard" className="rounded-lg">{dict.PrintSettings.Standard}</SelectItem>
                                <SelectItem value="thermal" className="rounded-lg">{dict.PrintSettings.Thermal}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end mt-10">
                    <Button type="submit" size="lg" className="gap-2 min-w-[200px] h-14 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all text-lg font-bold" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{dict.Settings.Form.Saving}</span>
                            </div>
                        ) : (
                            <>
                                <Save size={22} />
                                <span>{dict.Settings.Form.Save}</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
