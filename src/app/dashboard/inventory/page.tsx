
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight">{dict.Inventory.Title}</h1>
                </div>
                <div className="flex flex-wrap gap-2">
                    {/* Excel Button Disabled for Desktop Native Stability
                    <ExcelExportButton
                        getData={getInventoryExport}
                        fileName="Inventory_Report"
                        label={dict.Inventory.ExportExcel}
                    /> 
                    */}
                    <BulkUploadDialog />
                    <AddProductDialog triggerLabel={dict.Inventory.NewItem} />
                </div>
            </div>

            <InventoryClient initialProducts={productsList} dict={dict} />
        </div>
    );
}
