
import { getDictionary } from "@/lib/i18n-server";
import { ProductForm } from "@/features/inventory/components/product-form";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Toaster } from "sonner";

export const dynamic = 'force-dynamic';

export default async function CreateProductPage() {
    const dict = await getDictionary() as any;

    return (
        <div className="space-y-6 max-w-4xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Dialogs?.AddProduct?.Title || "Add Product"}</h1>
                    <p className="text-muted-foreground">{dict.Dialogs?.AddProduct?.Description || "Create a new product in inventory"}</p>
                </div>
                <Link href="/dashboard/inventory">
                    <Button variant="outline">
                        {dict.Common?.Back || "Back"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <ProductForm />
            </div>
            <Toaster />
        </div>
    );
}
