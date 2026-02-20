"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, Printer, HardDrive, ShieldAlert, Database, Users, ChevronLeft, Receipt, FileText, Monitor, Scale } from "lucide-react";
import { SettingsForm } from "./settings-form";
import { PrintSettingsForm } from "./print-settings-form";
import { StorageLocationForm } from "./storage-location-form";
import { TaxSettingsForm } from "./tax-settings-form";
import { InvoiceSettingsForm } from "./invoice-settings-form";
import { BackupManager } from "./backup-manager";
import { InterfaceSettingsForm } from "./interface-settings-form";
import { FiscalClosingManager } from "../../accounting/components/fiscal-closing-manager";
import { WarehouseManager } from "../../inventory/components/warehouse-manager";
import { DangerZone } from "../../admin/components/danger-zone";
import { UserList } from "../../admin/components/user-list";
import { useTranslation } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

export function SettingsContentManager({ settings, users, isSuperAdmin }: { settings: any, users: any[], isSuperAdmin: boolean }) {
    const { dict } = useTranslation() as any;
    const [activeTab, setActiveTab] = useState<string | null>(null);

    const isDesktop = true;

    const cards = [
        { id: "facility", title: dict.Settings?.Tabs?.Facility, icon: Building2, color: "text-blue-600", bgColor: "bg-blue-50" },
        { id: "accounting", title: dict.Settings?.Tabs?.Accounting, icon: Scale, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { id: "warehouses", title: dict.Inventory?.Warehouses?.Title, icon: HardDrive, color: "text-emerald-600", bgColor: "bg-emerald-50" },
        { id: "interface", title: dict.Settings?.Tabs?.Interface, icon: Monitor, color: "text-rose-600", bgColor: "bg-rose-50" },
        { id: "taxes", title: dict.Settings?.Tabs?.Taxes, icon: Receipt, color: "text-green-600", bgColor: "bg-green-50" },
        { id: "invoices", title: dict.Settings?.Tabs?.Invoices, icon: FileText, color: "text-indigo-600", bgColor: "bg-indigo-50" },
        { id: "print", title: dict.PrintSettings?.Title, icon: Printer, color: "text-orange-600", bgColor: "bg-orange-50" },
        { id: "storage", title: dict.StorageLocation?.Title, icon: HardDrive, color: "text-purple-600", bgColor: "bg-purple-50" },
        { id: "backup", title: dict.Settings?.Tabs?.Backup, icon: Database, color: "text-emerald-600", bgColor: "bg-emerald-50", desktopOnly: true },
        { id: "danger", title: dict.Settings?.Tabs?.Danger, icon: ShieldAlert, color: "text-red-600", bgColor: "bg-red-50", desktopOnly: true },
        { id: "subscribers", title: dict.Settings?.Tabs?.Subscribers, icon: Users, color: "text-cyan-600", bgColor: "bg-cyan-50", superAdminOnly: true }
    ];

    // ... handle activeTab ...

    if (!activeTab) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto py-10 animate-in fade-in duration-500">
                {cards.map((card) => {
                    if (card.desktopOnly && !isDesktop) return null;
                    if (card.superAdminOnly && !isSuperAdmin) return null;

                    return (
                        <button
                            key={card.id}
                            onClick={() => setActiveTab(card.id)}
                            className="flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all text-center aspect-video group"
                        >
                            <div className={cn("p-3 rounded-xl mb-3 transition-transform group-hover:scale-110", card.bgColor, card.color)}>
                                <card.icon size={28} />
                            </div>
                            <span className="text-sm font-bold text-slate-700 group-hover:text-primary">{card.title}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    const currentCard = cards.find(c => c.id === activeTab);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-4 bg-white p-3 rounded-xl border shadow-sm">
                <button
                    onClick={() => setActiveTab(null)}
                    className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                    title={dict.Common?.Back}
                >
                    <ChevronLeft className="w-5 h-5 rtl:rotate-180" />
                </button>
                <div className="flex items-center gap-2 border-r pr-4 rtl:border-r-0 rtl:border-l rtl:pl-4">
                    <div className={cn("p-2 rounded-lg", currentCard?.bgColor, currentCard?.color)}>
                        {currentCard && <currentCard.icon size={20} />}
                    </div>
                    <h2 className="font-bold text-slate-800">{currentCard?.title}</h2>
                </div>

                {/* Simple Horizontal Tab Switcher */}
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {cards.map(c => {
                        if (c.desktopOnly && !isDesktop) return null;
                        if (c.superAdminOnly && !isSuperAdmin) return null;
                        return (
                            <button
                                key={c.id}
                                onClick={() => setActiveTab(c.id)}
                                className={cn(
                                    "px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                                    activeTab === c.id ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-50"
                                )}
                            >
                                {c.title}
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="min-h-[500px]">
                {activeTab === "facility" && <SettingsForm initialData={settings} />}
                {activeTab === "accounting" && <FiscalClosingManager />}
                {activeTab === "warehouses" && <WarehouseManager />}
                {activeTab === "interface" && <InterfaceSettingsForm initialData={settings} />}
                {activeTab === "taxes" && <TaxSettingsForm initialData={settings} />}
                {activeTab === "invoices" && <InvoiceSettingsForm initialData={settings} />}
                {activeTab === "print" && <PrintSettingsForm initialData={settings} />}
                {activeTab === "storage" && <StorageLocationForm initialData={settings} />}
                {activeTab === "backup" && isDesktop && <BackupManager initialData={settings} />}
                {activeTab === "danger" && isDesktop && <DangerZone />}
                {activeTab === "subscribers" && isSuperAdmin && <UserList users={users} />}
            </div>
        </div>
    );
}
