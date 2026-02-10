"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider";

export function TaxSettingsForm({ initialData }: { initialData: any }) {
    const { dict, lang } = useTranslation() as any;
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({
        taxEnabled: initialData?.taxEnabled || false,
        taxName: initialData?.taxName || "VAT",
        taxNameEn: initialData?.taxNameEn || "VAT",
        taxRate: initialData?.taxRate || 14,
        taxId: initialData?.taxId || "",
        taxType: initialData?.taxType || "inclusive" // inclusive or exclusive
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const payload = {
                ...initialData,
                ...settings,
                taxRate: Number(settings.taxRate),
            };

            const result = await updateSettings(payload);

            if (result.success) {
                toast.success(dict.Common?.Success || "Success", {
                    description: dict.Settings?.Form?.Success || "Updated successfully",
                });
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                toast.error((dict.Common?.Error || "Error") + ": " + result.message);
            }
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <span>{dict.Settings?.Taxes?.Title || "Tax Settings"}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                {/* Enable/Disable Tax */}
                <div className="flex items-center justify-between p-4 border rounded-xl bg-slate-50">
                    <div className="space-y-0.5">
                        <Label className="text-base">{dict.Settings?.Taxes?.Enable || "Enable Tax"}</Label>
                        <p className="text-xs text-muted-foreground">{dict.Settings?.Taxes?.EnableHint || "Enable automatic tax calculation in invoices"}</p>
                    </div>
                    <div className="flex items-center">
                        <Switch
                            id="tax-enabled"
                            checked={settings.taxEnabled}
                            onCheckedChange={(checked) => setSettings(s => ({ ...s, taxEnabled: checked }))}
                            className="data-[state=checked]:bg-blue-600 border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>
                </div>

                <div className={`grid gap-6 md:grid-cols-2 transition-opacity duration-300 ${!settings.taxEnabled ? 'opacity-50 pointer-events-none' : ''}`}>

                    {/* Tax Name (Ar) */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Taxes?.NameAr || "Tax Name (Arabic)"}</Label>
                        <Input
                            value={settings.taxName}
                            onChange={(e) => setSettings(s => ({ ...s, taxName: e.target.value }))}
                            placeholder={dict.Settings?.Taxes?.Placeholders?.NameAr || "e.g. VAT"}
                        />
                    </div>

                    {/* Tax Name (En) */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Taxes?.NameEn || "Tax Name (English)"}</Label>
                        <Input
                            value={settings.taxNameEn}
                            onChange={(e) => setSettings(s => ({ ...s, taxNameEn: e.target.value }))}
                            placeholder="e.g. VAT"
                            className="text-left ltr"
                        />
                    </div>

                    {/* Tax Rate */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Taxes?.Rate || "Rate (%)"}</Label>
                        <div className="relative">
                            <Input
                                type="number"
                                value={settings.taxRate}
                                onChange={(e) => setSettings(s => ({ ...s, taxRate: parseFloat(e.target.value) }))}
                                className="pl-8"
                            />
                            <span className="absolute left-3 top-2.5 text-slate-400 font-bold">%</span>
                        </div>
                    </div>

                    {/* Tax Registration Number */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Taxes?.TaxId || "Tax ID"}</Label>
                        <Input
                            value={settings.taxId}
                            onChange={(e) => setSettings(s => ({ ...s, taxId: e.target.value }))}
                            placeholder="123456789"
                        />
                    </div>

                    {/* Tax Calculation Method */}
                    <div className="space-y-2 md:col-span-2">
                        <Label>{dict.Settings?.Taxes?.CalculationMethod || "Tax Calculation Method"}</Label>
                        <Select
                            value={settings.taxType}
                            onValueChange={(val) => setSettings(s => ({ ...s, taxType: val as any }))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="inclusive">{dict.Settings?.Taxes?.Inclusive || "Inclusive"}</SelectItem>
                                <SelectItem value="exclusive">{dict.Settings?.Taxes?.Exclusive || "Exclusive"}</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-slate-500 pt-1">
                            * {dict.Settings?.Taxes?.Hint || "Can be changed per invoice."}
                        </p>
                    </div>

                </div>

                <div className="pt-4 flex justify-end border-t">
                    <Button onClick={handleSave} disabled={isLoading} className="gap-2 min-w-[120px]">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        {dict.Settings?.Form?.Save || "Save Settings"}
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
