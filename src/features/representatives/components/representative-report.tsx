"use client";

import { useState } from "react";
import { format } from "date-fns";
import { DateRange } from "react-day-picker";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getRepresentativeReport } from "../actions";
import { toast } from "sonner";
import { Search, Calculator, Wallet, Receipt, Printer } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { PayCommissionDialog } from "./pay-commission-dialog";
import { useSettings } from "@/components/providers/settings-provider";
import { formatCurrency } from "@/lib/utils";
import { Num } from "@/components/ui/num";

interface RepresentativeReportProps {
    representativeId: number;
}

export function RepresentativeReport({ representativeId }: RepresentativeReportProps) {
    const { dict: rawDict } = useTranslation() as any;
    const dict = rawDict;
    const { currency } = useSettings();
    const [date, setDate] = useState<DateRange | undefined>({
        from: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        to: new Date(),
    });

    const [reportData, setReportData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [payDialogOpen, setPayDialogOpen] = useState(false);

    const handlePrint = () => {
        if (!date?.from || !date?.to) return;
        const startDate = format(date.from, "yyyy-MM-dd");
        const endDate = format(date.to, "yyyy-MM-dd");
        const url = `/print/representatives/${representativeId}?start=${startDate}&end=${endDate}`;
        window.open(url, '_blank');
    };

    const handleSearch = async () => {
        if (!date?.from || !date?.to) {
            toast.error(dict.Common.Error);
            return;
        }

        setLoading(true);
        try {
            const startDate = format(date.from, "yyyy-MM-dd");
            const endDate = format(date.to, "yyyy-MM-dd");
            const data = await getRepresentativeReport(representativeId, startDate, endDate);
            setReportData(data);
        } catch (error) {
            toast.error(dict.Common.Error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="shadow-md">
                <CardHeader className="pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Calculator className="h-5 w-5 text-primary" />
                        {dict.Representatives.Reports.Title}
                    </CardTitle>
                    <CardDescription>
                        {dict.Representatives.Reports.Description}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                        <div className="w-full sm:w-auto">
                            <label className="text-sm font-medium mb-1 block text-muted-foreground">{dict.Common.DateRange}</label>
                            <DateRangePicker date={date} onSelect={setDate} />
                        </div>
                        <Button onClick={handleSearch} disabled={loading} className="w-full sm:w-auto min-w-[120px]">
                            {loading ? dict.Common.Loading : (
                                <>
                                    <Search className="mr-2 h-4 w-4" />
                                    {dict.Common.Search}
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {reportData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-end pr-1">
                        <Button variant="outline" size="sm" onClick={() => handlePrint()} className="gap-2 bg-white shadow-sm border-blue-100 text-blue-600 hover:bg-blue-50">
                            <Printer size={16} />
                        </Button>
                    </div>

                    <div className="space-y-6 p-4 md:p-0">
                        {/* Print Header (Visible only when printing) */}
                        <div className="hidden print:block text-center mb-8 border-b-2 border-blue-600 pb-4">
                            <h1 className="text-3xl font-black text-blue-800 mb-2">{dict.Representatives?.Report?.Title || "Performance Report"}</h1>
                            <h2 className="text-xl font-bold">{reportData.representative.name}</h2>
                            <p className="text-sm text-gray-500 mt-2">
                                From: {date?.from ? format(date.from, "yyyy-MM-dd") : '---'} To: {date?.to ? format(date.to, "yyyy-MM-dd") : '---'}
                            </p>
                        </div>
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            <Card className="bg-blue-50 border-blue-100">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm text-blue-600 font-medium mb-1">{dict.Dashboard.TotalSales}</span>
                                    <div className="text-xl font-bold text-blue-700">
                                        {formatCurrency(Number(reportData.summary.totalSales), currency)}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {reportData.summary.invoicesCount} {dict.Invoices?.Table?.InvoiceNo || "Invoice"}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-green-50 border-green-100">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm text-green-600 font-medium mb-1">{dict.Invoices?.Table?.PaidAmount || "Collected"}</span>
                                    <div className="text-xl font-bold text-green-700">
                                        {formatCurrency(Number(reportData.summary.totalCollected), currency)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-amber-50 border-amber-100">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm text-amber-600 font-medium mb-1">{dict.Representatives?.Report?.CommissionRateCard || "Commission Rate"}</span>
                                    <div className="text-xl font-bold text-amber-700">
                                        <Num value={reportData.summary.commissionRate} />
                                        <span className="text-xs font-normal ml-1">
                                            {reportData.summary.commissionType === 'percentage' ? '%' : `${currency} / Inv`}
                                        </span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {reportData.summary.commissionType === 'percentage' ? (dict.Representatives?.Report?.NoSales === 'No Sales' ? 'On Sales' : dict.Representatives?.Report?.NoSales) : 'Per Invoice'}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-indigo-50 border-indigo-100">
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                    <span className="text-sm text-indigo-600 font-medium mb-1">{dict.Representatives?.AddDialog?.FixedSalary || "Salary"}</span>
                                    <div className="text-xl font-bold text-indigo-700">
                                        {formatCurrency(Number(reportData.summary.salary), currency)}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="bg-purple-50 border-purple-100 shadow-sm relative overflow-hidden col-span-1 sm:col-span-2 lg:col-span-1">
                                <div className="absolute top-0 right-0 p-2 opacity-10">
                                    <Wallet size={64} />
                                </div>
                                <CardContent className="p-6 flex flex-col items-center justify-center text-center relative z-10">
                                    <span className="text-sm text-purple-600 font-bold mb-1">{dict.Representatives?.Report?.CommissionDue || "Commission (Due)"}</span>
                                    <div className="text-2xl font-extrabold text-purple-800 mb-2">
                                        {formatCurrency(Number(reportData.summary.totalDue), currency)}
                                    </div>
                                    <p className="text-[10px] text-purple-500 mb-2">
                                        {dict.Representatives?.Report?.SalaryPlus || "(Salary + Commission)"}
                                    </p>
                                    <Button
                                        size="sm"
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                                        onClick={() => setPayDialogOpen(true)}
                                        disabled={reportData.summary.totalDue <= 0}
                                    >
                                        <Wallet className="mr-2 h-4 w-4" />
                                        {dict.Common?.Settle || "Settle & Pay"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        <PayCommissionDialog
                            open={payDialogOpen}
                            setOpen={setPayDialogOpen}
                            data={{
                                representativeId,
                                amount: reportData.summary.totalDue,
                                period: `${date?.from ? format(date.from, 'yyyy-MM-dd') : ''} to ${date?.to ? format(date.to, 'yyyy-MM-dd') : ''}`,
                                name: reportData.representative.name,
                                currency: currency
                            }}
                        />

                        {/* Invoices Table */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-muted-foreground" />
                                    {dict.Dashboard?.SalesInvoices || "Sales Invoices"}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="rounded-md border overflow-hidden" dir="rtl">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.InvoiceNo || "Ref"}</TableHead>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.Date || "Date"}</TableHead>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.Customer || "Customer"}</TableHead>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.Total || "Total"}</TableHead>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.PaidAmount || "Paid"}</TableHead>
                                                <TableHead className="text-right font-bold text-primary">{dict.Invoices?.Table?.Status || "Status"}</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody className="text-right">
                                            {reportData.invoices.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                                        {dict.Common.NoData}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                reportData.invoices.map((inv: any) => (
                                                    <TableRow key={inv.id} className="hover:bg-muted/30">
                                                        <TableCell className="font-mono">
                                                            <Num value={inv.invoiceNumber} />
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {(() => {
                                                                if (!inv.issueDate) return '---';
                                                                const d = new Date(inv.issueDate);
                                                                return isNaN(d.getTime()) ? '---' : <Num value={format(d, 'yyyy-MM-dd')} />;
                                                            })()}
                                                        </TableCell>
                                                        <TableCell>{inv.customerName}</TableCell>
                                                        <TableCell className="font-bold">
                                                            {formatCurrency(Number(inv.totalAmount), currency)}
                                                        </TableCell>
                                                        <TableCell className="text-green-600 font-medium">
                                                            {formatCurrency(Number(inv.amountPaid), currency)}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={inv.paymentStatus === 'paid' ? 'default' : inv.paymentStatus === 'partial' ? 'secondary' : 'destructive'} className="text-[10px]">
                                                                {inv.paymentStatus === 'paid' ? (dict.Invoices?.Table?.Paid || 'محصل') : inv.paymentStatus}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
