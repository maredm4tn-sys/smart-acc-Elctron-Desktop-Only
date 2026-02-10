"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { updateSettings } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider";

export function InvoiceSettingsForm({ initialData }: { initialData: any }) {
    const { dict } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    const [settings, setSettings] = useState({
        invoicePrefix: initialData?.invoicePrefix || "INV-",
        nextInvoiceNumber: initialData?.nextInvoiceNumber || 1,
        invoiceFooterNotes: initialData?.invoiceFooterNotes || "",
    });

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const payload = {
                ...initialData,
                ...settings,
                // Ensure number is transmitted as number
                nextInvoiceNumber: parseInt(settings.nextInvoiceNumber.toString()),
            };

            const result = await updateSettings(payload);

            if (result.success) {
                toast.success(dict.Common?.Success || "Success", {
                    description: dict.Settings?.Form?.Success || "Saved successfully",
                });
            } else {
                throw new Error(result.message || dict.Common?.Error || "Error");
            }
        } catch (error: any) {
            toast.error(dict.Common?.Error || "Error", {
                description: error.message || "An error occurred",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="border-none shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-custom-blue" />
                    <span>{dict.Settings?.Invoices?.Title || "Invoicing & Numbering"}</span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Invoice Prefix */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Invoices?.Prefix || "Invoice Prefix"}</Label>
                        <Input
                            className="bg-slate-50 font-mono text-center"
                            value={settings.invoicePrefix}
                            onChange={(e) => setSettings(s => ({ ...s, invoicePrefix: e.target.value }))}
                            placeholder={dict.Settings?.Invoices?.Placeholders?.Prefix || "e.g. INV-"}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {dict.Settings?.Invoices?.Hints?.Prefix || "Appears before number"} <span className="font-mono bg-slate-100 px-1 rounded">{settings.invoicePrefix}1001</span>
                        </p>
                    </div>

                    {/* Next Invoice Number */}
                    <div className="space-y-2">
                        <Label>{dict.Settings?.Invoices?.Counter || "Counter"}</Label>
                        <Input
                            type="number"
                            className="bg-slate-50 font-mono text-center"
                            value={settings.nextInvoiceNumber}
                            onChange={(e) => setSettings(s => ({ ...s, nextInvoiceNumber: parseInt(e.target.value) || 0 }))}
                            min={1}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {dict.Settings?.Invoices?.Hints?.Counter || "Reset sequence carefully"}
                        </p>
                    </div>

                    {/* Footer Notes */}
                    <div className="space-y-2 md:col-span-2">
                        <Label>{dict.Settings?.Invoices?.FooterNotes || "Footer Notes"}</Label>
                        <Textarea
                            className="bg-slate-50 min-h-[100px]"
                            value={settings.invoiceFooterNotes}
                            onChange={(e) => setSettings(s => ({ ...s, invoiceFooterNotes: e.target.value }))}
                            placeholder={dict.Settings?.Invoices?.Placeholders?.FooterNotes || "Ex: Thank you text..."}
                        />
                        <p className="text-[11px] text-muted-foreground">
                            {dict.Settings?.Invoices?.Hints?.Footer || "Appears at bottom of invoice"}
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
