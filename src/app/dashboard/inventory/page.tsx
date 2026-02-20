
import { getDictionary } from "@/lib/i18n-server";
import { getProducts } from "@/features/inventory/actions";
import { AddProductDialog } from "@/features/inventory/components/add-product-dialog";
import { BulkUploadDialog } from "@/features/inventory/components/bulk-upload-dialog";
import { InventoryClient } from "@/features/inventory/components/inventory-client";
import { getSession } from "@/features/auth/actions";

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
    const dict = await getDictionary() as any;
    const productsList = await getProducts();
    const session = await getSession();

    return (
        <InventoryClient initialProducts={productsList} dict={dict} />
    );
}
