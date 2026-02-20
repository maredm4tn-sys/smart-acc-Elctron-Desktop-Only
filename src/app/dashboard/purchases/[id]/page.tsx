
import { getPurchaseInvoiceById } from "@/features/purchases/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import PurchaseDetailsClient from "@/app/dashboard/purchases/[id]/purchase-details-client";
import { notFound } from "next/navigation";

export default async function PurchaseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as any;

    const invoice = await getPurchaseInvoiceById(Number(id));

    if (!invoice) {
        notFound();
    }

    return (
        <div className="p-6">
            <PurchaseDetailsClient invoice={invoice} dict={dict} currency={currency} />
        </div>
    );
}
