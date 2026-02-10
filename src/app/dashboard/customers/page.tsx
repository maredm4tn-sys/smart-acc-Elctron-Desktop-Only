
import { getDictionary } from "@/lib/i18n-server";
import { getCustomers } from "@/features/customers/actions";
import { AddCustomerDialog } from "@/features/customers/components/add-customer-dialog";
import { CustomerImport } from "@/features/customers/components/customer-import";
import { CustomersClient } from "@/features/customers/components/customers-client";
import { getAllRepresentatives } from "@/features/representatives/actions";
import { getSession } from "@/features/auth/actions";

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
    const dict = await getDictionary() as any;
    const customers = await getCustomers();
    const representatives = await getAllRepresentatives();
    const session = await getSession();

    const isAdmin = session?.role?.toUpperCase() === 'ADMIN' || session?.role?.toUpperCase() === 'SUPER_ADMIN' || true;

    return (
        <CustomersClient initialCustomers={customers} dict={dict} session={session} representatives={representatives} />
    );
}

