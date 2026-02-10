
import { getDictionary } from "@/lib/i18n-server";
import { CustomerForm } from "@/features/customers/components/customer-form";
import { getAllRepresentatives } from "@/features/representatives/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Toaster } from "sonner";

export const dynamic = 'force-dynamic';

export default async function CreateCustomerPage() {
    const dict = await getDictionary() as any;
    const representatives = await getAllRepresentatives();

    return (
        <div className="space-y-6 max-w-2xl mx-auto pb-10">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Dialogs?.AddCustomer?.Title || "Add Customer"}</h1>
                    <p className="text-muted-foreground">{dict.Dialogs?.AddCustomer?.Description || "Create a new customer profile"}</p>
                </div>
                <Link href="/dashboard/customers">
                    <Button variant="outline">
                        {dict.Common?.Back || "Back"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-2xl border shadow-sm">
                <CustomerForm representatives={representatives} />
            </div>
            <Toaster />
        </div>
    );
}
