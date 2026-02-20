"use client";

import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";
import { bulkImportCustomers } from "@/features/customers/actions";

export function CustomerImport() {
    const { dict } = useTranslation();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleButtonClick = async () => {
        // PREFER ELECTRON IPC IF AVAILABLE
        if (typeof window !== 'undefined' && (window as any).electron?.importExcel) {
            setIsUploading(true);
            try {
                // 1. Get Data from Main Process (Secure Read)
                const result = await (window as any).electron.importExcel();

                if (!result.success) {
                    if (result.message !== 'Canceled') toast.error(result.error );
                    setIsUploading(false);
                    return;
                }

                // 2. Send Data to Server Action (Secure Write)
                const importRes = await bulkImportCustomers(result.data);

                if (importRes.success) {
                    toast.success(importRes.data );
                    window.location.reload();
                } else {
                    toast.error(importRes.message);
                }

            } catch (err: any) {
                toast.error(err.message);
            } finally {
                setIsUploading(false);
            }
            return;
        }

        fileInputRef.current?.click();
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const response = await fetch("/api/customers/import", {
                method: "POST",
                body: formData,
            });

            if (response.ok) {
                toast.success(dict.Common?.Success);
            } else {
                toast.error(dict.Common?.Error);
            }
        } catch (error) {
            toast.error(dict.Common.Error);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    return (
        <>
            <input
                type="file"
                accept=".xlsx, .xls"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                title="Upload Excel"
            />
            <Button
                variant="outline"
                onClick={handleButtonClick}
                disabled={isUploading}
                className="flex items-center justify-center gap-2 h-10 px-4 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl shadow-sm transition-all"
            >
                <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                <span className="font-bold">{isUploading ? dict.Common.Loading : dict.Customers.ImportExcel}</span>
            </Button>
        </>
    );
}
