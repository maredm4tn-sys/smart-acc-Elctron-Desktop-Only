import { getDictionary } from "@/lib/i18n-server";
import { getRepresentatives } from "@/features/representatives/actions";
import { RepresentativesClient } from "@/features/representatives/components/representatives-client";

export default async function RepresentativesPage() {
    const rawDict = (await getDictionary()) || {};
    const dict = rawDict as any;
    const result = (await getRepresentatives(1, 100)) || { representatives: [] };

    return (
        <RepresentativesClient representatives={result.representatives || []} dict={dict} />
    );
}
