import { getSettings } from "@/features/settings/actions";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary } from "@/lib/i18n-server";
import { getSession } from "@/features/auth/actions";
import { getAllUsers } from "@/features/admin/actions";
import { SettingsContentManager } from "@/features/settings/components/settings-content-manager";

export default async function SettingsPage() {
    const settings = await getSettings();
    const dict = (await getDictionary()) as any;
    const session = await getSession();

    const isSuperAdmin = session?.role === "SUPER_ADMIN";
    const users = isSuperAdmin ? await getAllUsers() : [];

    return (
        <div className="space-y-8 max-w-7xl mx-auto px-4 pb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
                <div>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">
                        {dict.Sidebar.Settings}
                    </h1>
                    <p className="text-slate-500 text-lg font-medium">
                        {dict.Settings?.Description || "Manage system settings and customize user experience."}
                    </p>
                </div>
            </div>

            <SettingsContentManager
                settings={settings}
                users={users}
                isSuperAdmin={isSuperAdmin}
            />

            <Toaster />
        </div>
    );
}
