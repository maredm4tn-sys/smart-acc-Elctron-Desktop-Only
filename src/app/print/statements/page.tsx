import { getCustomerStatement, getAccountStatement } from "@/features/reports/statement-actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import { formatNumber, formatCurrency } from "@/lib/utils";
import { Calendar, TrendingUp, DollarSign } from "lucide-react";

export default async function PrintStatement({ searchParams }: { searchParams: Promise<{ type: string, id: string, start: string, end: string }> }) {
    const { type, id, start, end } = await searchParams;

    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary();

    let data;
    if (type === 'customer' || type === 'supplier') {
        data = await getCustomerStatement(type as any, Number(id), new Date(start), new Date(end));
    } else {
        data = await getAccountStatement(Number(id), new Date(start), new Date(end));
    }

    if (!data) return <div className="p-10 text-center">Error loading statement data</div>;

    const { statement, entity, openingBalance, closingBalance } = data;

    const getReportTitle = () => {
        const titles = dict?.Reports?.GeneralStatement?.ReportTitles;
        if (!titles) return "كشف حساب";
        switch (type) {
            case 'customer': return titles.Customer || "كشف حساب عميل";
            case 'supplier': return titles.Supplier || "كشف حساب مورد";
            case 'treasury': return titles.Treasury || "كشف حركة نقدية";
            case 'expense': return titles.Expense || "تحليل مصروفات";
            default: return titles.General || "كشف حساب عام";
        }
    };

    return (
        <div className="p-10 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{getReportTitle()}</h1>
                    <p className="text-slate-500 text-sm">تاريخ الطباعة: {new Date().toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                    <h2 className="text-2xl font-black text-blue-700">{entity?.name}</h2>
                    <p className="text-sm text-slate-500 font-mono">CODE: {entity?.code || 'N/A'}</p>
                </div>
            </div>

            <p className="text-slate-600 mb-6 font-bold">
                تقرير حركة الحساب في الفترة من {start} إلى {end}
            </p>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-6 mb-10 border p-6 rounded-xl bg-slate-50">
                <div className="text-center border-l border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">الرصيد الافتتاحي</p>
                    <p className="text-xl font-black dir-ltr">{formatNumber(openingBalance)}</p>
                </div>
                <div className="text-center border-l border-slate-200">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">إجمالي الحركة</p>
                    <p className="text-xl font-black dir-ltr text-blue-600">{formatNumber(closingBalance - openingBalance)}</p>
                </div>
                <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-400 mb-1">الرصيد الختامي</p>
                    <p className="text-2xl font-black dir-ltr bg-blue-100 px-4 py-1 rounded-lg inline-block">{formatNumber(closingBalance)}</p>
                </div>
            </div>

            {/* Table */}
            <table className="w-full text-xs border-collapse border border-slate-300">
                <thead>
                    <tr className="bg-slate-200">
                        <th className="p-2 border border-slate-300 text-start">التاريخ</th>
                        <th className="p-2 border border-slate-300 text-start">الاستحقاق</th>
                        <th className="p-2 border border-slate-300 text-start">البيان</th>
                        <th className="p-2 border border-slate-300 text-start">المرجع</th>
                        <th className="p-2 border border-slate-300 text-end">مدين (+)</th>
                        <th className="p-2 border border-slate-300 text-end">دائن (-)</th>
                        <th className="p-2 border border-slate-300 text-end bg-slate-100">الرصيد</th>
                    </tr>
                </thead>
                <tbody>
                    {statement.map((row: any, idx: number) => (
                        <tr key={idx}>
                            <td className="p-2 border border-slate-300">{new Date(row.date).toLocaleDateString('en-GB')}</td>
                            <td className="p-2 border border-slate-300 font-bold text-amber-700">{row.dueDate ? new Date(row.dueDate).toLocaleDateString('en-GB') : '-'}</td>
                            <td className="p-2 border border-slate-300 font-bold">{row.description}</td>
                            <td className="p-2 border border-slate-300 font-mono text-[10px]">{row.reference || '-'}</td>
                            <td className="p-2 border border-slate-300 text-end dir-ltr">{row.debit > 0 ? formatNumber(row.debit) : '0.00'}</td>
                            <td className="p-2 border border-slate-300 text-end dir-ltr">{row.credit > 0 ? formatNumber(row.credit) : '0.00'}</td>
                            <td className="p-2 border border-slate-300 text-end font-black dir-ltr bg-slate-50">{formatNumber(row.balance)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="mt-20 flex justify-between items-end border-t pt-10 px-10">
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

            <div className="mt-10 text-[9px] text-center text-slate-400 border-t pt-2">
                {dict.Reports.GeneralStatement.Footer.replace('{date}', new Date().toLocaleString('ar-EG'))}
            </div>

            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
