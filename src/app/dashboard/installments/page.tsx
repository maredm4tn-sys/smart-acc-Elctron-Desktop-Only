import { getDictionary } from "@/lib/i18n-server";
import { getInstallments } from "@/features/installments/actions";
import { InstallmentsClient } from "@/features/installments/components/installments-client";
import { Toaster } from "@/components/ui/sonner";

import { TranslationKeys } from "@/lib/translation-types";

export const dynamic = 'force-dynamic';

export default async function InstallmentsPage() {
    const dict = await getDictionary() as TranslationKeys;
    const installmentsData = await getInstallments();

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{dict.Installments.Title}</h1>
                    <p className="text-muted-foreground">{dict.Installments.Description}</p>
                </div>
            </div>

            <InstallmentsClient initialData={installmentsData} />

            <Toaster />
        </div>
    );
}
