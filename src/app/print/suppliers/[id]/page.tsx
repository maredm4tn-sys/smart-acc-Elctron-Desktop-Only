import { getSupplierStatement } from "@/features/suppliers/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

import { TranslationKeys } from "@/lib/translation-types";

export default async function PrintSupplierStatement({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as TranslationKeys;
    const data = await getSupplierStatement(id);

    if (!data) return <div>Error loading data</div>;

    const { supplier, transactions, summary } = data;

    return (
        <div className="p-10 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Suppliers.Statement.Title}</h1>
                    <h2 className="text-2xl font-black text-blue-700">{supplier.name}</h2>
                    <p className="text-slate-500 text-sm">{dict.Common.ReportDate}: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left" dir="ltr">
                    <h2 className="text-xl font-bold">{dict.Logo}</h2>
                    <p className="text-xs text-muted-foreground">{dict.Suppliers.Statement.Title}</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-6 mb-10 border p-6 rounded-xl bg-slate-50">
                <div className="text-center border-l border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Suppliers.Statement.Summary.TotalCredit}</p>
                    <p className="text-xl font-black dir-ltr text-red-600 font-mono">{formatCurrency(summary.totalCredit, currency)}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Suppliers.Statement.Summary.TotalDebit}</p>
                    <p className="text-xl font-black dir-ltr text-green-600 font-mono">{formatCurrency(summary.totalDebit, currency)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Suppliers.Statement.Summary.NetBalance}</p>
                    <p className="text-xl font-black dir-ltr text-blue-700 font-bold font-mono">{formatCurrency(summary.netBalance, currency)}</p>
                </div>
            </div>

            {/* Table */}
            <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="text-right">{dict.Suppliers.Statement.Table.Date}</TableHead>
                        <TableHead className="text-center">{dict.Suppliers.Statement.Table.Type}</TableHead>
                        <TableHead className="text-center">{dict.Suppliers.Statement.Table.Ref}</TableHead>
                        <TableHead className="text-right">{dict.Suppliers.Statement.Table.Description}</TableHead>
                        <TableHead className="text-center text-red-600 font-bold">{dict.Suppliers.Statement.Table.Credit}</TableHead>
                        <TableHead className="text-center text-green-600 font-bold">{dict.Suppliers.Statement.Table.Debit}</TableHead>
                        <TableHead className="text-center font-black">{dict.Suppliers.Statement.Table.Balance}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t: any) => (
                        <TableRow key={t.id}>
                            <TableCell className="text-right font-mono text-sm">
                                {format(new Date(t.date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-center">
                                {t.type === 'INVOICE' ? dict.Suppliers.Statement.Table.Invoice : dict.Dashboard.QuickActions.PaymentVoucher}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs text-slate-500">{t.ref || t.reference || "-"}</TableCell>
                            <TableCell className="text-right text-sm">{t.description}</TableCell>
                            <TableCell className="text-center font-mono text-red-600">{t.credit > 0 ? formatCurrency(t.credit, currency) : "-"}</TableCell>
                            <TableCell className="text-center font-mono text-green-600">{t.debit > 0 ? formatCurrency(t.debit, currency) : "-"}</TableCell>
                            <TableCell className="text-center font-mono font-black" dir="ltr">{formatCurrency(t.balance, currency)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Footer */}
            <div className="mt-20 flex justify-between items-end border-t pt-10">
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.PrintSettings.AccountantSignature}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.PrintSettings.ReviewSignature}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.PrintSettings.Stamp}</p>
                    <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
