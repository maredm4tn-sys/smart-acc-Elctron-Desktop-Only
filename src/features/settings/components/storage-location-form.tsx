"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { updateSettings } from "../actions";
import { Save, HardDrive, MapPin, AlertTriangle, FolderOpen } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function StorageLocationForm({ initialData }: { initialData: any }) {
    const { dict, lang } = useTranslation() as any;

    const storageSchema = z.object({
        storagePath: z.string().optional(),
    });

    type StorageFormValues = z.infer<typeof storageSchema>;

    const {
        register,
        handleSubmit,
        setValue,
        formState: { isSubmitting },
    } = useForm<StorageFormValues>({
        resolver: zodResolver(storageSchema),
        defaultValues: {
            storagePath: initialData?.storagePath || "",
        },
    });

    const handleBrowse = () => {
        const input = document.createElement('input');
        input.type = 'file';
        (input as any).webkitdirectory = true;
        input.onchange = (e: any) => {
            const files = e.target.files;
            if (files && files.length > 0) {
                const path = files[0].path || files[0].webkitRelativePath.split('/')[0] || files[0].name;
                setValue("storagePath", path);
            }
        };
        input.click();
    };

    const onSubmit = async (data: StorageFormValues) => {
        try {
            const res = await updateSettings({
                ...initialData,
                ...data,
                tenantId: initialData?.id || "uuid",
            });

            if (res.success) {
                toast.success(dict.StorageLocation.SaveSuccess);
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Common?.Error || "Error");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-morphism p-8 rounded-2xl border shadow-xl backdrop-blur-md bg-white/40 max-w-3xl mx-auto border-primary/10">
                <div className="flex items-center gap-4 mb-8 border-b border-primary/10 pb-6">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                        <HardDrive size={32} className="text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{dict.StorageLocation.Title}</h2>
                        <p className="text-sm text-muted-foreground">{dict.StorageLocation.Description}</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* Active Path Indicator */}
                    <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between animate-pulse-slow">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                            <span className="text-xs font-bold text-blue-700">{dict.StorageLocation.ActivePath || "Current Active Path:"}</span>
                        </div>
                        <code className="text-[10px] bg-white px-2 py-1 rounded border border-blue-100 text-slate-600 font-mono dir-ltr max-w-[250px] truncate">
                            {initialData?.activeDbPath || "Determining..."}
                        </code>
                    </div>

                    <div className="space-y-3 p-6 rounded-2xl bg-white/50 border border-slate-100 hover:border-primary/20 transition-all">
                        <Label htmlFor="storagePath" className="text-base font-bold text-slate-700 flex items-center gap-2">
                            <FolderOpen size={18} className="text-primary/60" />
                            {dict.StorageLocation.PathLabel}
                        </Label>
                        <div className="flex gap-2">
                            <div className="relative group flex-1">
                                <MapPin className="absolute right-4 top-4 h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
                                <Input
                                    id="storagePath"
                                    {...register("storagePath")}
                                    className="h-14 pr-11 rounded-xl border-slate-200 bg-white/80 focus:ring-primary/20 text-lg shadow-inner"
                                    placeholder={dict.StorageLocation.PathPlaceholder}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleBrowse}
                                className="h-14 w-14 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all shadow-md active:scale-95 flex items-center justify-center p-0"
                                title={dict.Common?.Open || "Browse"}
                            >
                                <FolderOpen size={24} />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 p-5 rounded-2xl bg-amber-50/70 border border-amber-100 text-amber-900 shadow-sm animate-pulse-slow">
                        <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5 shrink-0" />
                        <div className="space-y-1">
                            <p className="text-sm font-bold">{dict.Common?.Note || "Note"}</p>
                            <p className="text-xs leading-relaxed opacity-90">{dict.StorageLocation.Hint}</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-10">
                    <Button type="submit" size="lg" className="gap-2 min-w-[200px] h-14 rounded-2xl shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all text-lg font-bold" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <div className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>{dict.Settings?.Form?.Saving || "Saving..."}</span>
                            </div>
                        ) : (
                            <>
                                <Save size={22} />
                                <span>{dict.Settings?.Form?.Save || "Save"}</span>
                            </>
                        )}
                    </Button>
                </div>
            </div>
        </form>
    );
}
