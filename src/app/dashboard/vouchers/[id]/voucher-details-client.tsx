
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { Calendar, User, FileText, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function VoucherDetailsClient({ voucher, dict, currency }: { voucher: any, dict: any, currency: string }) {
    const partyName =
        voucher.partyType === 'customer' ? voucher.customer?.name :
            voucher.partyType === 'supplier' ? voucher.supplier?.name :
                voucher.partyType === 'other' ? voucher.account?.name :
                    dict.Vouchers?.Form?.Types?.Other;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/vouchers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {voucher.type === 'receipt' ? dict.Vouchers?.Receipt : dict.Vouchers?.Payment} #{voucher.voucherNumber}
                        </h1>
                        <p className="text-muted-foreground">{dict.Vouchers?.Description}</p>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <User size={14} /> {dict.Vouchers?.Table?.Party}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{partyName}</div>
                        <Badge variant="outline" className="mt-1">
                            {voucher.partyType === 'customer' ? dict.Vouchers?.Form?.Types?.Customer :
                                voucher.partyType === 'supplier' ? dict.Vouchers?.Form?.Types?.Supplier :
                                    dict.Vouchers?.Form?.Types?.Other}
                        </Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Calendar size={14} /> {dict.Vouchers?.Table?.Date}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{voucher.date}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <FileText size={14} /> {dict.Vouchers?.Table?.Status}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant={voucher.status === 'posted' ? 'secondary' : 'outline'}>
                            {voucher.status === 'posted' ? dict.Vouchers?.Table?.StatusLabels?.Posted :
                                voucher.status === 'draft' ? dict.Vouchers?.Table?.StatusLabels?.Draft : voucher.status}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Info size={18} /> {dict.Common?.Details}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <span className="text-muted-foreground">{dict.Vouchers?.Table?.Amount}</span>
                        <span className="text-2xl font-black text-primary dir-ltr">{formatCurrency(voucher.amount, currency)}</span>
                    </div>
                    <div className="flex justify-between items-start border-b pb-2">
                        <span className="text-muted-foreground">{dict.Common?.Description}</span>
                        <span className="text-md text-end max-w-[70%]">{voucher.description || dict.Common?.NA}</span>
                    </div>

                    {voucher.createdByUser && (
                        <div className="text-xs text-muted-foreground pt-2">
                            {dict.Common?.CreatedBy}: {voucher.createdByUser.name}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
