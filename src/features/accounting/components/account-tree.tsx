"use client";

import { Folder, FolderOpen, FileText, ChevronRight, ChevronDown, Plus, MoreHorizontal, Trash2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { AccountWithChildren } from "../types";
import { Button } from "@/components/ui/button";
import { deleteAccount } from "../actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/components/providers/i18n-provider";
import { TranslationKeys } from "@/lib/translation-types";
import { useSettings } from "@/components/providers/settings-provider";
import { Num } from "@/components/ui/num";

interface AccountTreeItemProps {
    account: AccountWithChildren;
    level?: number;
    dict: TranslationKeys;
}

function AccountTreeItem({ account, level = 0, dict }: AccountTreeItemProps) {
    const { numeralSystem } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const hasChildren = account.children && account.children.length > 0;
    const router = useRouter();

    // Color coding based on account type
    const typeColors: Record<string, string> = {
        asset: "text-blue-600",
        liability: "text-red-600",
        equity: "text-purple-600",
        revenue: "text-green-600",
        expense: "text-orange-600",
    };

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();

        // Use standard confirm for now
        if (!confirm(`${dict.Accounts.Tree.DeleteConfirm} "${account.name}"?`)) return;

        try {
            const res = await deleteAccount(account.id);
            if (res.success) {
                toast.success(res.message);
                router.refresh();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Accounts.Tree.DeleteError);
        }
    };

    const getTranslatedName = (name: string) => {
        // Handle "Auto" accounts created by sales system
        if (name.includes("(Auto)") || name.includes("(تلقائي)")) {
            if (name.includes("Cash") || name.includes("الخزينة") || name.includes("الصندوق"))
                return dict.Accounting.SystemAccounts.MainCash + (dict.Common.Direction === "rtl" ? " (تلقائي)" : " (Auto)");
            if (name.includes("Sales") || name.includes("المبيعات"))
                return dict.Accounting.SystemAccounts.SalesRevenue + (dict.Common.Direction === "rtl" ? " (تلقائي)" : " (Auto)");
            if (name.includes("Customer") || name.includes("العملاء"))
                return dict.Accounting.SystemAccounts.Customers + (dict.Common.Direction === "rtl" ? " (تلقائي)" : " (Auto)");
            if (name.includes("Discount") || name.includes("الخصم"))
                return dict.Accounting.SystemAccounts.AllowedDiscount + (dict.Common.Direction === "rtl" ? " (تلقائي)" : " (Auto)");
        }

        // Map system codes to translated names (supporting both legacy '1000' and new '1' styles)
        const code = account.code.trim();
        const systemAccountMap: Record<string, string> = {
            '1': dict.Accounting.Categories.Asset,
            '1000': dict.Accounting.Categories.Asset,
            '2': dict.Accounting.Categories.Liability,
            '2000': dict.Accounting.Categories.Liability,
            '3': dict.Accounting.Categories.Equity,
            '3000': dict.Accounting.Categories.Equity,
            '4': dict.Accounting.Categories.Revenue,
            '4000': dict.Accounting.Categories.Revenue,
            '5': dict.Accounting.Categories.Expense,
            '5000': dict.Accounting.Categories.Expense,
            '11': dict.Accounting.SystemAccounts.CurrentAssets,
            '1100': dict.Accounting.SystemAccounts.CurrentAssets,
            '12': dict.Accounting.SystemAccounts.FixedAssets,
            '1200': dict.Accounting.SystemAccounts.FixedAssets,
            '1101': dict.Accounting.SystemAccounts.MainCash,
            '1102': dict.Accounting.SystemAccounts.Bank,
            '1103': dict.Accounting.SystemAccounts.Customers,
            '1104': dict.Accounting.SystemAccounts.Inventory,
            '1201': dict.Accounting.SystemAccounts.Furniture,
            '21': dict.Accounting.SystemAccounts.CurrentLiabilities,
            '2100': dict.Accounting.SystemAccounts.CurrentLiabilities,
            '2101': dict.Accounting.SystemAccounts.Suppliers,
            '31': dict.Accounting.SystemAccounts.Capital,
            '32': dict.Accounting.SystemAccounts.ProfitLoss,
            '41': dict.Accounting.SystemAccounts.SalesRevenue,
            '51': dict.Accounting.SystemAccounts.PurchasesCost,
            '52': dict.Accounting.SystemAccounts.GeneralExpenses,
            '5201': dict.Accounting.SystemAccounts.Salaries,
        };

        if (systemAccountMap[code]) return systemAccountMap[code];

        // Fallback: If name itself is English category name, translate it
        const nameUpper = name.toUpperCase();
        if (nameUpper === 'ASSETS' || nameUpper === 'ASSET') return dict.Accounting.Categories.Asset;
        if (nameUpper === 'LIABILITIES' || nameUpper === 'LIABILITY') return dict.Accounting.Categories.Liability;
        if (nameUpper === 'EQUITY') return dict.Accounting.Categories.Equity;
        if (nameUpper === 'REVENUE') return dict.Accounting.Categories.Revenue;
        if (nameUpper === 'EXPENSES' || nameUpper === 'EXPENSE') return dict.Accounting.Categories.Expense;

        return name;
    };

    return (
        <div className="select-none">
            <div
                className={cn(
                    "flex items-center gap-2 py-2 px-2 hover:bg-gray-100 rounded-md cursor-pointer group transition-colors",
                    level > 0 && "ms-6 border-s border-gray-200"
                )}
                onClick={() => hasChildren && setIsOpen(!isOpen)}
            >
                <div className="w-4 h-4 flex items-center justify-center">
                    {hasChildren && (
                        isOpen ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronRight size={14} className="text-gray-400 rtl:rotate-180" />
                    )}
                </div>

                <div className={cn("flex items-center gap-2 flex-1", hasChildren ? "font-medium" : "font-normal")}>
                    {hasChildren ? (
                        isOpen ? <FolderOpen size={16} className="text-yellow-500" /> : <Folder size={16} className="text-yellow-500" />
                    ) : (
                        <FileText size={16} className="text-gray-400" />
                    )}

                    <span className="font-mono text-xs text-gray-500 bg-gray-50 px-1 rounded border">
                        <Num value={account.code} />
                    </span>
                    <span className="flex-1">{getTranslatedName(account.name)}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full bg-opacity-10 capitalize", typeColors[account.type], `bg-${account.type === 'asset' ? 'blue' : 'gray'}-100`)}>
                        {dict.Accounts?.Types?.[account.type as keyof typeof dict.Accounts.Types] || account.type}
                    </span>
                    <span className="font-mono text-sm font-semibold">
                        <Num value={Number(account.balance)} precision={2} showGrouping={true} />
                    </span>
                </div>

                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" title={dict.Accounts.Tree.AddSubAccount}>
                        <Plus size={14} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 hover:text-red-500 hover:bg-red-50" title={dict.Accounts.Tree.Delete} onClick={handleDelete}>
                        <Trash2 size={14} />
                    </Button>
                </div>
            </div>

            {isOpen && hasChildren && (
                <div className="animate-in slide-in-from-top-1 duration-200">
                    {account.children!.map((child) => (
                        <AccountTreeItem key={child.id} account={child} level={level + 1} dict={dict} />
                    ))}
                </div>
            )}
        </div>
    );
}

export function AccountTree({ accounts }: { accounts: AccountWithChildren[] }) {
    const { dict } = useTranslation();

    if (accounts.length === 0) {
        return (
            <div className="text-center py-10 text-gray-500">
                <p>{dict.Accounts.Tree.NoAccounts}</p>
                <p className="text-sm">{dict.Accounts.Tree.StartGuide}</p>
            </div>
        );
    }

    return (
        <div className="border rounded-lg p-4 bg-white min-h-[400px] overflow-x-auto">
            <div className="min-w-[500px]">
                {accounts.map((account) => (
                    <AccountTreeItem key={account.id} account={account} dict={dict} />
                ))}
            </div>
        </div>
    );
}
