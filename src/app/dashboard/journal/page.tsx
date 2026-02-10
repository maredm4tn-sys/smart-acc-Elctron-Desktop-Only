import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getJournalEntries, getJournalExport } from "@/features/accounting/actions";
import { getSession } from "@/features/auth/actions";
import { ExcelExportButton } from "@/components/common/excel-export-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getDictionary, getLocale } from "@/lib/i18n-server";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { getSettings } from "@/features/settings/actions";
import { JournalTableClient } from "@/features/accounting/components/journal-table-client";

export const dynamic = 'force-dynamic';

export default async function JournalListPage() {
    const session = await getSession();
    const isAdmin = session?.role === 'admin' || session?.role === 'SUPER_ADMIN';

    const entries = await getJournalEntries();
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary();
    const lang = await getLocale();

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">{dict.Journal.Title}</h2>
                    <p className="text-sm md:text-base text-muted-foreground">{dict.Journal.Description}</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    {isAdmin && (
                        <div className="flex-1 sm:flex-none">
                            <ExcelExportButton
                                getData={getJournalExport}
                                fileName="Journal_Entries"
                                label={dict.Journal.ExportExcel}
                            />
                        </div>
                    )}
                    <Link href="/dashboard/journal/new" className="flex-1 sm:flex-none">
                        <Button className="gap-2 w-full">
                            <Plus size={16} />
                            {dict.Journal.NewEntry}
                        </Button>
                    </Link>
                </div>
            </div>

            <Card className="border-none shadow-md">
                <CardHeader className="pb-2 border-b border-slate-50 bg-slate-50/30">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <span className="font-extrabold">{dict.Journal.FinancialLog}</span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <JournalTableClient
                        initialEntries={entries}
                        dict={dict}
                        currency={currency}
                    />
                </CardContent>
            </Card>
        </div>

    );
}
