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
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateSettings } from "../actions";
import { Save, Monitor, Languages, ZoomIn, Info } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";

export function InterfaceSettingsForm({ initialData }: { initialData: any }) {
    const { dict } = useTranslation();
    const { updateSettingsLocally } = useSettings();

    const interfaceSchema = z.object({
        numeralSystem: z.enum(["latn", "arab"]),
        zoomLevel: z.number().min(0.5).max(2.0),
    });

    type InterfaceFormValues = z.infer<typeof interfaceSchema>;

    const {
        handleSubmit,
        setValue,
        watch,
        formState: { isSubmitting },
    } = useForm<InterfaceFormValues>({
        resolver: zodResolver(interfaceSchema),
        defaultValues: {
            numeralSystem: initialData?.numeralSystem || "latn",
            zoomLevel: initialData?.zoomLevel || 1.0,
        },
    });

    const watchNumerals = watch("numeralSystem");
    const watchZoom = watch("zoomLevel");

    const onSubmit = async (data: InterfaceFormValues) => {
        try {
            const res = await updateSettings({
                ...data,
                tenantId: initialData?.id || "tenant_default"
            });

            if (res.success) {
                toast.success(dict.Settings.Form.SaveSuccess);
                updateSettingsLocally(data);
                // No need to reload for zoom/numerals as they are handled by effects/localStorage
            } else {
                toast.error(res.message);
            }
        } catch (error: any) {
            toast.error(dict.Common.Error);
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-morphism p-8 rounded-2xl border shadow-lg space-y-8 backdrop-blur-md bg-white/40 max-w-2xl mx-auto">
                <h2 className="text-xl font-bold flex items-center gap-3 border-b border-primary/10 pb-4 mb-6">
                    <Monitor size={24} className="text-primary" />
                    {dict.Settings.InterfaceForm.Title}
                </h2>

                {/* Numeral System */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                        <Languages size={18} className="text-blue-500" />
                        <Label htmlFor="numeralSystem">{dict.Settings.InterfaceForm.NumeralSystem}</Label>
                    </div>
                    <Select
                        value={watchNumerals}
                        onValueChange={(val: any) => setValue("numeralSystem", val)}
                    >
                        <SelectTrigger className="h-11 rounded-xl w-full">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="latn">{dict.Settings.InterfaceForm.NumeralLatn}</SelectItem>
                            <SelectItem value="arab">{dict.Settings.InterfaceForm.NumeralArab}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Zoom Level */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-700 font-bold">
                            <ZoomIn size={18} className="text-indigo-500" />
                            <Label>{dict.Settings.InterfaceForm.ZoomLevel}</Label>
                        </div>
                        <span className="text-primary font-black bg-primary/10 px-3 py-1 rounded-lg">
                            {Math.round(watchZoom * 100)}%
                        </span>
                    </div>
                    <div className="pt-2">
                        <Slider
                            value={[watchZoom]}
                            min={0.5}
                            max={1.5}
                            step={0.05}
                            onValueChange={(vals) => setValue("zoomLevel", vals[0])}
                            className="py-4"
                        />
                    </div>
                </div>

                {/* Help Box */}
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 flex gap-3 text-blue-700 text-sm">
                    <Info size={18} className="shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-medium">
                        {dict.Settings.InterfaceForm.ZoomHelp}
                    </p>
                </div>

                <div className="flex justify-end pt-4 border-t border-primary/10">
                    <Button type="submit" size="lg" className="gap-2 min-w-[180px] h-12 rounded-xl" disabled={isSubmitting}>
                        <Save size={18} />
                        <span>{isSubmitting ? dict.Settings.Form.Saving : dict.Settings.Form.Save}</span>
                    </Button>
                </div>
            </div>
        </form>
    );
}
