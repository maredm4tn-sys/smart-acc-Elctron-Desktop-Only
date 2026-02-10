
"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, X } from "lucide-react";
import { useState } from "react";

interface ExpenseFiltersProps {
    onFilter: (filters: any) => void;
    dict: any;
}

export function ExpenseFilters({ onFilter, dict }: ExpenseFiltersProps) {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [activePeriod, setActivePeriod] = useState<string>("all");

    const handlePeriodClick = (period: string) => {
        setActivePeriod(period);
        onFilter({ period });
        // Clear dates when using predefined period
        setFromDate("");
        setToDate("");
    };

    const handleApplyDateRange = () => {
        setActivePeriod("custom");
        onFilter({ fromDate, toDate });
    };

    const handleClear = () => {
        setFromDate("");
        setToDate("");
        setActivePeriod("all");
        onFilter({ period: "all" });
    };

    return (
        <div className="space-y-4 bg-white p-4 rounded-xl border shadow-sm">
            {/* Row 1: Custom Date Range */}
            <div className="flex flex-col sm:flex-row items-end gap-3">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dict.Expenses.AddDialog.FromDate}
                    </label>
                    <Input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="h-9 font-bold"
                    />
                </div>
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {dict.Expenses.AddDialog.ToDate}
                    </label>
                    <Input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="h-9 font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        size="sm"
                        onClick={handleApplyDateRange}
                        disabled={!fromDate || !toDate}
                        className="h-9 bg-blue-600 hover:bg-blue-700 font-bold px-6"
                    >
                        {dict.Expenses.AddDialog.ApplyFilter}
                    </Button>
                    {(fromDate || toDate || activePeriod !== "all") && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClear}
                            className="h-9 px-2"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Row 2: Quick Filters */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t">
                <span className="text-xs font-black text-gray-400 mx-2">{dict.Expenses.AddDialog.QuickPeriod}:</span>
                <Button
                    variant={activePeriod === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodClick("all")}
                    className="h-8 text-xs rounded-full font-black px-4"
                >
                    {dict.Expenses.LatestTransactions}
                </Button>
                <Button
                    variant={activePeriod === "day" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodClick("day")}
                    className="h-8 text-xs rounded-full font-black px-4"
                >
                    {dict.Expenses.AddDialog.Today}
                </Button>
                <Button
                    variant={activePeriod === "week" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodClick("week")}
                    className="h-8 text-xs rounded-full font-black px-4"
                >
                    {dict.Expenses.AddDialog.Week}
                </Button>
                <Button
                    variant={activePeriod === "month" ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePeriodClick("month")}
                    className="h-8 text-xs rounded-full font-black px-4"
                >
                    {dict.Expenses.AddDialog.Month}
                </Button>
            </div>
        </div>
    );
}
