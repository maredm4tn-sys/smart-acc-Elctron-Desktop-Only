
import { getInvoiceWithItems } from "@/features/sales/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import InvoiceDetailsClient from "./invoice-details-client";
import { notFound } from "next/navigation";

export default async function InvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as any;

    const result = await getInvoiceWithItems(Number(id));
    const invoice = result.success ? result.data : null;

    if (!invoice) {
        notFound();
    }

    return (
        <div className="p-6">
            <InvoiceDetailsClient invoice={invoice} dict={dict} currency={currency} />
        </div>
    );
}
