"use client";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { bulkImportProducts } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider";

export function BulkUploadDialog() {
    const { dict } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleNativeImport = async () => {
        setIsLoading(true);
        try {
            // 1. Native Secure Read
            if (typeof window !== 'undefined' && (window as any).electron?.importExcel) {
                const result = await (window as any).electron.importExcel();

                if (!result.success) {
                    if (result.message !== 'Canceled') toast.error(result.error || dict.Common?.Error || "Failed to read file");
                    setIsLoading(false);
                    return;
                }

                const jsonData = result.data;
                processData(jsonData);
                return;
            }
        } catch (e: any) {
            toast.error(e.message);
            setIsLoading(false);
        }
    };

    const processData = async (jsonData: any[]) => {
        if (!jsonData || jsonData.length === 0) {
            toast.error(dict?.Inventory?.ImportDialog?.EmptyError || "File is empty or invalid");
            setIsLoading(false);
            return;
        }

        // Send RAW data to the server to handle the complex mapping we added there
        const result = await bulkImportProducts(jsonData);

        if (result.success) {
            toast.success(result.message || "Import completed successfully");
            setOpen(false);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    // Fallback for Web (if needed, but we focus on Desktop)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsLoading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);
            processData(jsonData);
        } catch (error: any) {
            console.error("Critical Import Error:", error);
            toast.error(dict.Inventory?.Import?.ProcessError || "An error occurred while processing the file");
            setIsLoading(false);
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <FileSpreadsheet size={16} />
                    <span>{dict?.Inventory?.BulkUpload || "Bulk Upload (Excel)"}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict?.Inventory?.ImportDialog?.Title || "Import Inventory"}</DialogTitle>
                    <DialogDescription>
                        {dict?.Inventory?.ImportDialog?.Description || "Import data from Excel files using standard column names."}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        {/* Desktop Native Import Button */}
                        <Button onClick={handleNativeImport} disabled={isLoading} className="w-full">
                            {isLoading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    {dict?.Inventory?.ImportDialog?.Processing || "Importing..."}
                                </>
                            ) : (
                                dict?.Inventory?.ImportDialog?.FileLabel || "Select Excel File"
                            )}
                        </Button>

                        {/* Hidden Input for Web Fallback (Optional) */}
                        <div className="hidden">
                            <Input id="excel-file" type="file" accept=".xlsx, .xls" onChange={handleFileUpload} disabled={isLoading} />
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
