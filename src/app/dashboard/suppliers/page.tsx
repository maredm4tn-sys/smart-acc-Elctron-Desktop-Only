
import { getDictionary } from "@/lib/i18n-server";
import { getSuppliers } from "@/features/suppliers/actions";
import { AddSupplierDialog } from "@/features/suppliers/components/add-supplier-dialog";
import { SuppliersClient } from "@/features/suppliers/components/suppliers-client";

export const dynamic = 'force-dynamic';

export default async function SuppliersPage() {
    // 1. Load Dictionary & Data on Server
    const dict = await getDictionary() as any;
    const suppliers = await getSuppliers();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict.Suppliers.Title}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict.Suppliers.Description}</p>
                </div>
                <div className="w-full sm:w-auto">
                    <AddSupplierDialog />
                </div>
            </div>

            {/* 2. Pass data to Client Component */}
            <SuppliersClient initialSuppliers={suppliers} dict={dict} />
        </div>
    );
}
