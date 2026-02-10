
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, TrendingDown } from "lucide-react";
import { AddExpenseDialog } from "./add-expense-dialog";
import { ExpenseFilters } from "./expense-filters";
import { getExpensesList } from "@/features/accounting/actions";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesClientPage({
    initialData,
    accountsList,
    dict
}: {
    initialData: any;
    accountsList: any;
    dict: any;
}) {
    const [data, setData] = useState(initialData);
    const [loading, setLoading] = useState(false);

    const handleFilter = async (filters: any) => {
        setLoading(true);
        try {
            const newData = await getExpensesList(filters);
            setData(newData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-black flex items-center gap-2">
                        <Wallet className="text-red-500" />
                        {dict.Expenses.Title}
                    </h1>
                    <p className="text-xs md:text-sm text-gray-500 mt-1 font-bold">{dict.Expenses.Description}</p>
                </div>

                <div className="w-full sm:w-auto">
                    <AddExpenseDialog accounts={accountsList || []} />
                </div>
            </div>

            {/* Summary Grid */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-red-50/50 border-red-100 shadow-sm border-x-4">
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-black text-gray-500 flex items-center gap-2">
                            <Wallet className="h-4 w-4 text-red-500" />
                            {dict.Expenses.Summary?.TotalMonthly}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black text-red-700 dir-ltr">{formatCurrency(data.monthlyTotal)}</div>
                        <p className="text-xs text-gray-400 mt-1 font-bold">{dict.Expenses.Summary?.MonthToDate}</p>
                    </CardContent>
                </Card>

                <Card className="bg-blue-50/50 border-blue-100 shadow-sm border-x-4">
                    <CardHeader className="pb-2 p-4">
                        <CardTitle className="text-sm font-black text-gray-500 flex items-center gap-2">
                            <TrendingDown className="h-4 w-4 text-blue-500" />
                            {dict.Expenses.CurrentPeriodTotal}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-black text-blue-700 dir-ltr">{formatCurrency(data.filteredTotal)}</div>
                        <p className="text-xs text-gray-400 mt-1 font-bold">{dict.Expenses.BasedOnPeriod}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters Section */}
            <ExpenseFilters onFilter={handleFilter} dict={dict} />

            {/* Expenses List */}
            <Card className="border-none shadow-md overflow-hidden relative rounded-2xl">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] flex items-center justify-center z-10">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                    </div>
                )}
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-black">{dict.Expenses.LatestTransactions}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 sm:p-6">
                    <div className="rt-table-container">
                        <table className="rt-table w-full">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="w-[120px] text-center font-black">{dict.Expenses.Table?.Date}</th>
                                    <th className="text-start font-black">{dict.Expenses.Table?.Account}</th>
                                    <th className="text-start font-black">{dict.Expenses.Table?.Description}</th>
                                    <th className="text-end font-black">{dict.Expenses.Table?.Amount}</th>
                                    <th className="w-[150px] text-end font-black">{dict.Expenses.Table?.EntryNo}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {data.expenses.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-16 text-gray-400 font-black text-lg">
                                            {dict.Expenses.Table?.NoExpenses}
                                        </td>
                                    </tr>
                                ) : (
                                    data.expenses.map((expense: any) => (
                                        <tr key={expense.id} className="hover:bg-red-50/10 transition-colors">
                                            <td className="font-bold text-gray-600 text-center py-4">
                                                {expense.date ? new Date(expense.date).toLocaleDateString('en-GB') : '---'}
                                            </td>
                                            <td className="text-start py-4">
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-bold">
                                                    {expense.accountName || '---'}
                                                </Badge>
                                            </td>
                                            <td className="text-gray-500 text-start py-4 font-bold">{expense.description || '---'}</td>
                                            <td className="font-black text-red-600 text-end py-4 dir-ltr text-lg">
                                                {formatCurrency(expense.amount || 0)}
                                            </td>
                                            <td className="text-[10px] text-gray-400 font-black text-end py-4">
                                                {expense.entryNumber || '---'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
