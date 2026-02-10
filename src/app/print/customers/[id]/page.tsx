import { getCustomerStatement } from "@/features/customers/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function PrintCustomerStatement({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary();
    const data = await getCustomerStatement(Number(id));

    if (!data) return <div>Error loading data</div>;

    const { customer, transactions, summary } = data;

    return (
        <div className="p-10 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Customers.Statement.Title}</h1>
                    <h2 className="text-2xl font-black text-blue-700">{customer.name}</h2>
                    <p className="text-slate-500 text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-xl font-bold">Smart Accountant</h2>
                    <p className="text-xs text-muted-foreground">كشف حساب عميل مالي</p>
                </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-6 mb-10 border p-6 rounded-xl bg-slate-50">
                <div className="text-center border-l border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Customers.Statement.Summary.TotalDebit}</p>
                    <p className="text-xl font-black dir-ltr">{formatCurrency(summary.totalDebit, currency)}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Customers.Statement.Summary.TotalCredit}</p>
                    <p className="text-xl font-black dir-ltr">{formatCurrency(summary.totalCredit, currency)}</p>
                </div>
                <div className="text-center">
                    <p className="text-xs font-bold text-slate-400 mb-1">{dict.Customers.Statement.Summary.NetBalance}</p>
                    <p className="text-xl font-black dir-ltr text-blue-700 font-bold">{formatCurrency(summary.netBalance, currency)}</p>
                </div>
            </div>

            {/* Table */}
            <Table className="border rounded-xl">
                <TableHeader className="bg-slate-50">
                    <TableRow>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-center">النوع</TableHead>
                        <TableHead className="text-center">المرجع</TableHead>
                        <TableHead className="text-right">البيان</TableHead>
                        <TableHead className="text-center text-blue-600">مدين</TableHead>
                        <TableHead className="text-center text-green-600">دائن</TableHead>
                        <TableHead className="text-center font-bold">الرصيد</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {transactions.map((t: any) => (
                        <TableRow key={t.id}>
                            <TableCell className="text-right">
                                {format(new Date(t.date), "dd/MM/yyyy")}
                            </TableCell>
                            <TableCell className="text-center">
                                {t.type === 'INVOICE' ? 'فاتورة بيع' : 'سند قبض'}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs">{t.reference || t.ref || "-"}</TableCell>
                            <TableCell className="text-right">{t.description}</TableCell>
                            <TableCell className="text-center font-mono">{t.debit > 0 ? formatCurrency(t.debit, currency) : "-"}</TableCell>
                            <TableCell className="text-center font-mono">{t.credit > 0 ? formatCurrency(t.credit, currency) : "-"}</TableCell>
                            <TableCell className="text-center font-mono font-bold" dir="ltr">{formatCurrency(t.balance, currency)}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            {/* Footer */}
            <div className="mt-20 flex justify-between items-end border-t pt-10">
                <div className="text-center">
                    <p className="font-bold underline mb-10">توقيع المحاسب</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">توقيع المراجعة</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">ختم المؤسسة</p>
                    <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
