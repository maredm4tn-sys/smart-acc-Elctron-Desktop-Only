
import { getCustomerStatement } from "@/features/customers/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import CustomerStatementClient from "./customer-statement-client";

export default async function CustomerStatementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary();
    const data = await getCustomerStatement(Number(id));

    if (!data) {
        return <div className="p-8 text-center text-red-500">{dict.Common.Error}</div>;
    }

    return <CustomerStatementClient data={data} dict={dict} currency={currency} />;
}
