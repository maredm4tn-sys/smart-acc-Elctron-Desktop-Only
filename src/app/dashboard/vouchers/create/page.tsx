
import { getDictionary } from "@/lib/i18n-server";
import { VoucherForm } from "@/features/vouchers/components/voucher-form";
import { getCustomers } from "@/features/customers/actions";
import { getSuppliers } from "@/features/suppliers/actions";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Toaster } from "sonner";

export const dynamic = 'force-dynamic';

export default async function CreateVoucherPage({ searchParams }: { searchParams: { type?: string } }) {
    const dict = await getDictionary() as any;
    const customers = await getCustomers();
    const suppliers = await getSuppliers();
    const type = (await searchParams).type as 'receipt' | 'payment' || 'receipt';

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {type === 'receipt' ? (dict.Vouchers?.Receipt || "Receipt") : (dict.Vouchers?.Payment || "Payment")}
                    </h1>
                    <p className="text-muted-foreground">
                        {type === 'receipt' ? (dict.Vouchers?.NewReceipt || "New Receipt") : (dict.Vouchers?.NewPayment || "New Payment")}
                    </p>
                </div>
                <Link href="/dashboard/vouchers">
                    <Button variant="outline">
                        {dict.Common?.Back || "Back"}
                    </Button>
                </Link>
            </div>

            <div className="bg-white p-6 rounded-lg border shadow-sm">
                <VoucherForm customers={customers} suppliers={suppliers} defaultType={type} />
            </div>
            <Toaster />
        </div>
    );
}
