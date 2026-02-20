
import { getVoucherById } from "@/features/vouchers/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import VoucherDetailsClient from "./voucher-details-client";
import { notFound } from "next/navigation";

export default async function VoucherDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as any;

    const voucher = await getVoucherById(Number(id));

    if (!voucher) {
        notFound();
    }

    return (
        <div className="p-6">
            <VoucherDetailsClient voucher={voucher} dict={dict} currency={currency} />
        </div>
    );
}
