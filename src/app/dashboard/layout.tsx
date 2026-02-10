import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getSession } from "@/features/auth/actions";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { ShiftProvider } from "@/features/shifts/context/shift-context";
import { PrintProvider } from "@/components/printing/print-provider";
import { ActivationDialog } from "@/features/admin/components/activation-dialog";
import { OfflineSyncManager } from "@/components/common/offline-sync-manager";
import { SettingsProvider } from "@/components/providers/settings-provider";
import { getSettings } from "@/features/settings/actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();
    const dict = await getDictionary();
    const locale = await getLocale();
    const isRtl = locale === 'ar';
    const settings = await getSettings();

    return (
        <SettingsProvider initialSettings={settings}>
            <ShiftProvider>
                <PrintProvider>
                    <DashboardShell user={session} dict={dict} isRtl={isRtl}>
                        {children}
                    </DashboardShell>
                    <ActivationDialog dict={dict} />
                    <OfflineSyncManager />
                </PrintProvider>
            </ShiftProvider>
        </SettingsProvider>
    );
}
