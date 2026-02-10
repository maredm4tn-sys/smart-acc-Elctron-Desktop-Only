
import { getInvoices } from "@/features/sales/actions";
import { InvoicesTable } from "@/components/sales/invoices-table";

export const dynamic = 'force-dynamic';

export default async function SalesPage() {
    let invoicesList: any[] = [];

    try {
        const result = await getInvoices() as any;
        invoicesList = result.success ? result.data.invoices : [];
    } catch (e) {
        console.error("Failed to load invoices", e);
    }

    return <InvoicesTable initialInvoices={invoicesList} />;
}
