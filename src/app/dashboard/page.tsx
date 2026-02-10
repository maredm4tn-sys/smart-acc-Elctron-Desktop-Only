import { getSession } from "@/features/auth/actions";
import { getDashboardStats } from "@/features/dashboard/actions";
import DashboardView from "@/components/dashboard/dashboard-view";
import { getLocale } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";

export default async function DashboardPage() {
    const session = await getSession();
    if (!session) return null;
    const initialStats = await getDashboardStats();
    const lang = await getLocale();
    const settings = await getSettings();

    return <DashboardView data={initialStats} lang={lang} settings={settings} />;
}
