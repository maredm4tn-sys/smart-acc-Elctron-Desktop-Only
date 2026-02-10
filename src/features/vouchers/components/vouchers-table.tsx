"use client";

import { useTranslation } from "@/components/providers/i18n-provider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useSettings } from "@/components/providers/settings-provider";
import { formatCurrency } from "@/lib/utils";
import { Num } from "@/components/ui/num";

export function VouchersTable({ vouchers = [] }: { vouchers?: any[] }) {
    const { dict: rawDict } = useTranslation();
    const dict = rawDict as any; // safe cast
    const { currency } = useSettings();

    return (
        <div className="space-y-4">
            {/* Desktop Table */}
            <div className="hidden md:block rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{dict.Vouchers.Table.Number}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Date}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Type}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Party}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Amount}</TableHead>
                            <TableHead>{dict.Vouchers.Table.Status}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {vouchers?.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    {dict.Vouchers.Table.NoVouchers}
                                </TableCell>
                            </TableRow>
                        ) : (
                            vouchers?.map((v) => (
                                <TableRow key={v.id}>
                                    <TableCell className="font-medium">
                                        <Num value={v.voucherNumber} />
                                    </TableCell>
                                    <TableCell>
                                        <Num value={v.date} />
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={v.type === 'receipt' ? 'default' : 'secondary'}>
                                            {v.type === 'receipt' ? dict.Vouchers.Receipt : dict.Vouchers.Payment}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-700">
                                                {v.partyType === 'customer' && (v.customer?.name || dict.Vouchers.Form.Types.Customer)}
                                                {v.partyType === 'supplier' && (v.supplier?.name || dict.Vouchers.Form.Types.Supplier)}
                                                {v.partyType === 'other' && (v.account?.name || dict.Vouchers.Form.Types.Other)}
                                            </span>
                                            {v.partyId && <span className="text-[10px] text-gray-400">#<Num value={v.partyId} /></span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(v.amount, currency)}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {v.status === 'posted' ? dict.Vouchers.Table.StatusLabels.Posted :
                                                v.status === 'draft' ? dict.Vouchers.Table.StatusLabels.Draft : v.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-3 pb-20">
                {vouchers?.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">{dict.Vouchers.Table.NoVouchers}</div>
                ) : (
                    vouchers?.map((v) => (
                        <div key={v?.id || Math.random()} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 active:bg-slate-50 transition-colors">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-bold text-gray-900">
                                        <Num value={v?.voucherNumber} />
                                    </h3>
                                    <p className="text-[10px] text-gray-400 font-mono">
                                        <Num value={v.date} />
                                    </p>
                                </div>
                                <Badge variant={v.type === 'receipt' ? 'default' : 'secondary'} className={v.type === 'receipt' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}>
                                    {v.type === 'receipt' ? dict.Vouchers.Receipt : dict.Vouchers.Payment}
                                </Badge>
                            </div>

                            <div className="flex justify-between items-end border-t border-dashed pt-3">
                                <div className="space-y-1">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{dict.Vouchers.Table.Party}</div>
                                    <div className="text-sm font-medium text-slate-700">
                                        {v.partyType === 'customer' && (v.customer?.name || dict.Vouchers.Form.Types.Customer)}
                                        {v.partyType === 'supplier' && (v.supplier?.name || dict.Vouchers.Form.Types.Supplier)}
                                        {v.partyType === 'other' && (v.account?.name || dict.Vouchers.Form.Types.Other)}
                                        {v.partyId ? <small className="text-gray-400 ml-1">#<Num value={v.partyId} /></small> : ''}
                                    </div>
                                </div>
                                <div className="text-start">
                                    <div className="text-[10px] text-gray-400 uppercase tracking-wider">{dict.Vouchers.Table.Amount}</div>
                                    <div className="text-lg font-black text-blue-700">
                                        {formatCurrency(v.amount, currency)}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-1">
                                <span className={`w-2 h-2 rounded-full ${v.status === 'posted' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                    {v.status === 'posted' ? dict.Vouchers.Table.StatusLabels.Posted :
                                        v.status === 'draft' ? dict.Vouchers.Table.StatusLabels.Draft : v.status}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div>
    );
}
