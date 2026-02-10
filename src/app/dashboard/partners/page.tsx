import { getPartners } from "@/features/partners/actions";
import { getDictionary } from "@/lib/i18n-server";
import { PartnersClient } from "@/features/partners/components/partners-client";

export default async function PartnersPage() {
    const partners = await getPartners();
    const dict = await getDictionary();

    return (
        <PartnersClient
            initialPartners={partners.success ? partners.data : []}
            dict={dict}
        />
    );
}
