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
import { useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Loader2 } from "lucide-react";
import { bulkImportCustomers } from "../actions";
import { useTranslation } from "@/components/providers/i18n-provider";

export function BulkImportCustomersDialog() {
    const { dict } = useTranslation();
    const [open, setOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleNativeImport = async () => {
        setIsLoading(true);
        try {
            if (typeof window !== 'undefined' && (window as any).electron?.importExcel) {
                const result = await (window as any).electron.importExcel();

                if (!result.success) {
                    if (result.message !== 'Canceled') toast.error(result.error || dict.Common?.Error);
                    setIsLoading(false);
                    return;
                }

                const jsonData = result.data;
                processData(jsonData);
                return;
            } else {
                toast.error("Electron native import not available");
                setIsLoading(false);
            }
        } catch (e: any) {
            toast.error(e.message);
            setIsLoading(false);
        }
    };

    const processData = async (jsonData: any[]) => {
        if (!jsonData || jsonData.length === 0) {
            toast.error(dict?.Common?.NoData);
            setIsLoading(false);
            return;
        }

        const result = await bulkImportCustomers(jsonData);

        if (result.success) {
            toast.success(result.message );
            setOpen(false);
            setTimeout(() => window.location.reload(), 1500);
        } else {
            toast.error(result.message);
        }
        setIsLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold gap-2 shadow-sm rounded-xl h-10 px-4">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" />
                    <span className="hidden sm:inline">{dict.Customers?.ImportExcel}</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Customers?.ImportExcel}</DialogTitle>
                    <DialogDescription>
                        {dict.Customers?.Description}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Button onClick={handleNativeImport} disabled={isLoading} className="w-full h-12 rounded-xl">
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {dict.Common?.Loading}
                            </>
                        ) : (
                            dict.Common?.SelectFolder
                        )}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
