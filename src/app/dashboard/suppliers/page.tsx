
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
        <SuppliersClient initialSuppliers={suppliers} dict={dict} />
    );
}
