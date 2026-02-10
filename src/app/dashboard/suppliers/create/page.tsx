
import { getDictionary } from "@/lib/i18n-server";
import { SupplierForm } from "@/features/suppliers/components/supplier-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Toaster } from "sonner";

export const dynamic = 'force-dynamic';

export default async function CreateSupplierPage() {
    const dict = await getDictionary() as any;

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Suppliers?.AddDialog?.Title || "Add Supplier"}</h1>
                    <p className="text-muted-foreground">{dict.Suppliers?.AddDialog?.Description || "Create a new supplier profile"}</p>
                </div>
                <Link href="/dashboard/suppliers">
                    <Button variant="outline">
                        {dict.Common?.Back || "Back"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <SupplierForm />
            </div>
            <Toaster />
        </div>
    );
}
