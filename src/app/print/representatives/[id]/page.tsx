import { getRepresentativeReport } from "@/features/representatives/actions";
import { getDictionary } from "@/lib/i18n-server";
import { getSettings } from "@/features/settings/actions";
import { formatCurrency } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

export default async function PrintRepresentativeReport({
    params,
    searchParams
}: {
    params: Promise<{ id: string }>,
    searchParams: Promise<{ start?: string, end?: string }>
}) {
    const { id } = await params;
    const { start, end } = await searchParams;

    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary() as any;

    // Default dates if missing
    const startDate = start || format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), "yyyy-MM-dd");
    const endDate = end || format(new Date(), "yyyy-MM-dd");

    const data = await getRepresentativeReport(Number(id), startDate, endDate);

    if (!data) return <div className="p-10 text-center">Error loading report data</div>;

    const { representative, invoices, summary } = data;

    return (
        <div className="p-10 text-right" dir="rtl">
            {/* Header */}
            <div className="flex items-center justify-between border-b-2 border-blue-600 pb-6 mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 mb-1">{dict.Representatives?.Report?.Print?.Title}</h1>
                    <h2 className="text-2xl font-black text-blue-700">{representative.name}</h2>
                    <div className="text-slate-500 text-sm mt-2 flex gap-4">
                        <span>{dict.Representatives?.Report?.Print?.From} {startDate}</span>
                        <span>{dict.Representatives?.Report?.Print?.To} {endDate}</span>
                    </div>
                </div>
                <div className="text-left">
                    <h2 className="text-xl font-bold">Smart Accountant</h2>
                    <p className="text-xs text-muted-foreground">{dict.Representatives?.Report?.Print?.Subtitle}</p>
                    <p className="text-[10px] mt-1">{dict.Representatives?.Report?.Print?.PrintDate} {new Date().toLocaleDateString('en-GB')}</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-5 gap-4 mb-10 border p-4 rounded-xl bg-slate-50">
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Representatives?.Report?.Print?.TotalSales}</p>
                    <p className="text-lg font-black">{formatCurrency(summary.totalSales, currency)}</p>
                    <p className="text-[10px] text-slate-400">{summary.invoicesCount} {dict.Representatives?.Report?.Print?.InvoicesCount}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Representatives?.Report?.Print?.Collected}</p>
                    <p className="text-lg font-black text-green-600">{formatCurrency(summary.totalCollected, currency)}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Representatives?.Report?.Print?.FixedSalary}</p>
                    <p className="text-lg font-black">{formatCurrency(summary.salary, currency)}</p>
                </div>
                <div className="text-center border-l">
                    <p className="text-[10px] font-bold text-slate-400 mb-1">{dict.Representatives?.Report?.Print?.DueCommission}</p>
                    <p className="text-lg font-black text-orange-600">{formatCurrency(summary.totalCommission, currency)}</p>
                    <p className="text-[10px] text-slate-400">{summary.commissionRate} {summary.commissionType === 'percentage' ? dict.Representatives?.Report?.Print?.RatePercentage : dict.Representatives?.Report?.Print?.RateFixed}</p>
                </div>
                <div className="text-center">
                    <p className="text-[10px] font-bold text-slate-400 mb-1 font-black">{dict.Representatives?.Report?.Print?.TotalDue}</p>
                    <p className="text-lg font-black text-blue-700">{formatCurrency(summary.totalDue, currency)}</p>
                </div>
            </div>

            {/* Invoices Table */}
            <div className="mb-10">
                <h3 className="font-bold text-slate-700 mb-4 border-r-4 border-blue-500 pr-2">{dict.Representatives?.Report?.Print?.RelatedInvoicesTitle}</h3>
                <Table className="border rounded-lg">
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.InvoiceNo}</TableHead>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.Date}</TableHead>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.Customer}</TableHead>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.Total}</TableHead>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.Paid}</TableHead>
                            <TableHead className="text-center">{dict.Representatives?.Report?.Print?.Table?.Status}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {invoices.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center">{dict.Representatives?.Report?.Print?.NoData}</TableCell></TableRow>
                        ) : (
                            invoices.map((inv: any) => (
                                <TableRow key={inv.id}>
                                    <TableCell className="text-center font-mono">{inv.invoiceNumber}</TableCell>
                                    <TableCell className="text-center">{format(new Date(inv.issueDate), "yyyy-MM-dd")}</TableCell>
                                    <TableCell className="text-center">{inv.customerName}</TableCell>
                                    <TableCell className="text-center font-mono font-bold">{formatCurrency(inv.totalAmount, currency)}</TableCell>
                                    <TableCell className="text-center font-mono text-green-600">{formatCurrency(inv.amountPaid, currency)}</TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-[10px]">{inv.paymentStatus === 'paid' ? dict.Representatives?.Report?.Print?.StatusPaid : inv.paymentStatus === 'partial' ? dict.Representatives?.Report?.Print?.StatusPartial : dict.Representatives?.Report?.Print?.StatusDeferred}</span>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer */}
            <div className="mt-20 flex justify-between items-end border-t pt-10 px-10">
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Representatives?.Report?.Print?.RepSignature}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Representatives?.Report?.Print?.ReviewApproval}</p>
                    <p className="text-slate-300">..............................</p>
                </div>
                <div className="text-center">
                    <p className="font-bold underline mb-10">{dict.Representatives?.Report?.Print?.FacilityStamp}</p>
                    <div className="h-20 w-20 border-4 border-slate-100 rounded-full mx-auto opacity-20"></div>
                </div>
            </div>

            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
