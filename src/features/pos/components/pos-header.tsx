"use client";

import { usePOS } from "../context/pos-context";
import { User, Store, Calendar, CreditCard, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "@/components/providers/i18n-provider";

import { CustomerCombobox } from "./customer-combobox";

export function POSHeader() {
    const { header, setHeader, customers } = usePOS();
    const { dict } = useTranslation();

    // Prepare customers list with Cash Customer at top
    const allCustomerOptions = [
        { id: 0, name: dict?.POS?.CashCustomer },
        ...customers
    ];

    // Type Safe Setters
    const setCustomer = (id: string) => {
        const cust = allCustomerOptions.find(c => String(c.id) === id) as any;
        const updates: any = {
            customerId: Number(id),
            customerName: cust?.name || dict?.POS?.CashCustomer
        };

        // Auto-set price level if customer has one
        if (cust && cust.priceLevel) {
            updates.priceType = cust.priceLevel;
        } else if (id === "0") {
            updates.priceType = 'retail';
        }

        setHeader(updates);
    };

    const setPriceType = (val: string) => setHeader({ priceType: val as any });

    return (
        <div className="bg-white border-b p-3 shadow-sm space-y-3">
            {/* Top Row: Title & Invoice Info */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-blue-600 text-white p-2 rounded-lg shadow-sm">
                        <User size={20} />
                    </div>
                    <div>
                        <h2 className="font-bold text-lg leading-none">{dict?.Sales?.Invoice?.SimpleTitle}</h2>
                        <span className="text-xs text-gray-500 font-mono">#INV-NEW</span>
                    </div>
                </div>

                <div className="flex gap-2">
                    {/* Shift Manager is already localized presumably */}
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" className="gap-2 text-orange-600 border-orange-200 bg-orange-50">
                            <RotateCcw size={16} /> {dict?.Inventory?.Table?.MovementTypes?.Return} (Ctrl+R)
                        </Button>
                        <Button variant="outline" size="sm" className="gap-2">
                            <Store size={16} /> {dict?.Inventory?.Table?.MainStore}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Second Row: Inputs Form */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border">

                {/* 1. Customer */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{dict?.Sidebar?.Customers} (F2)</label>
                    <CustomerCombobox
                        customers={allCustomerOptions}
                        defaultValue={String(header.customerId)}
                        onSelect={setCustomer}
                        placeholder={dict?.POS?.SelectCustomer}
                    />
                </div>

                {/* 2. Price Type */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{dict?.Dialogs?.AddCustomer?.PriceLevel}</label>
                    <Select value={header.priceType} onValueChange={setPriceType}>
                        <SelectTrigger className="h-9 bg-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="retail">{dict?.Products?.Table?.PriceRetail}</SelectItem>
                            <SelectItem value="wholesale">{dict?.Products?.Table?.PriceWholesale}</SelectItem>
                            <SelectItem value="half_wholesale">{dict?.Products?.Table?.PriceHalfWholesale}</SelectItem>
                            <SelectItem value="special">{dict?.Products?.Table?.PriceSpecial}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* 3. Payment Method */}
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">{dict?.POS?.PaymentMethod}</label>
                    <Select value={header.paymentMethod} onValueChange={(v: any) => setHeader({ paymentMethod: v })}>
                        <SelectTrigger className="h-9 bg-white">
                            <div className="flex items-center gap-2">
                                <CreditCard size={14} className="text-gray-400" />
                                <SelectValue />
                            </div>
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="cash">{dict?.POS?.Cash}</SelectItem>
                            <SelectItem value="card">{dict?.POS?.Card}</SelectItem>
                            <SelectItem value="credit">{dict?.POS?.Credit}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
