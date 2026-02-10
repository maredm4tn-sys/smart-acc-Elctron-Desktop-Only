"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { cn } from "@/lib/utils";

interface CustomerComboboxProps {
    customers: any[];
    onSelect: (customer: any) => void;
    defaultValue?: string;
}

export function CustomerCombobox({ customers, onSelect, defaultValue }: CustomerComboboxProps) {
    const { dict } = useTranslation() as any;
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedCustomer = useMemo(() => {
        if (!defaultValue || defaultValue === "0") return null;
        return customers.find(c => c.id.toString() === defaultValue.toString());
    }, [customers, defaultValue]);

    // This handles the "Watermark" logic. If no customer is selected, placeholder shows "Cash Customer"
    useEffect(() => {
        if (!open) {
            setSearch(selectedCustomer?.name || "");
        }
    }, [selectedCustomer, open]);

    const filtered = useMemo(() => {
        const query = search.toLowerCase().trim();
        const baseList = customers.filter(c => c.id !== 0); // Don't show cash in list

        if (!query || query === selectedCustomer?.name?.toLowerCase().trim()) {
            return baseList.slice(0, 50);
        }
        return baseList.filter(c =>
            c.name.toLowerCase().includes(query)
        ).slice(0, 50);
    }, [customers, search, selectedCustomer]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Input Wrapper */}
            <div className="relative group">
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <User className={cn("h-4 w-4 transition-colors", open ? "text-blue-500" : "text-slate-400")} />
                </div>
                <input
                    className={cn(
                        "w-full h-11 pr-10 pl-8 rounded-lg border bg-white text-sm font-bold outline-none transition-all",
                        "placeholder:text-slate-400 placeholder:font-normal",
                        open ? "border-blue-500 ring-2 ring-blue-50" : "border-slate-200"
                    )}
                    placeholder={dict?.Common?.CashCustomer || "عميل نقدي"}
                    value={search}
                    onFocus={() => {
                        setOpen(true);
                        setSearch(""); // Show placeholder "Cash Customer" by clearing value
                    }}
                    onChange={(e) => setSearch(e.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                />
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <ChevronsUpDown className="h-3.5 w-3.5 text-slate-300" />
                </div>
            </div>

            {/* Clean Dropdown */}
            {open && (
                <div className="absolute z-[100] mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 && search !== "" ? (
                            <div className="p-4 text-center text-slate-400 text-xs italic">
                                {dict?.Common?.NoData || "لا توجد نتائج للبحث..."}
                            </div>
                        ) : (
                            filtered.map((customer) => (
                                <div
                                    key={customer.id}
                                    className={cn(
                                        "px-4 py-2.5 text-[13px] cursor-pointer flex justify-between items-center transition-colors border-b border-slate-50 last:border-0",
                                        defaultValue === String(customer.id) ? "bg-blue-50 text-blue-700 font-black" : "hover:bg-slate-50 text-slate-700 font-bold"
                                    )}
                                    onMouseDown={(e) => {
                                        // Use onMouseDown to prevent focus loss before selection
                                        e.preventDefault();
                                        onSelect(customer);
                                        setOpen(false);
                                    }}
                                >
                                    <span className="truncate">{customer.name}</span>
                                    {defaultValue === String(customer.id) && <Check className="h-3.5 w-3.5" />}
                                </div>
                            ))
                        )}

                        {/* Optional: Static "Back to Cash" if searched or scrolled */}
                        {search !== "" && (dict?.Common?.CashCustomer || "عميل نقدي").includes(search.toLowerCase()) && (
                            <div
                                className="px-4 py-2.5 text-[13px] cursor-pointer text-blue-600 font-bold hover:bg-blue-50 border-t border-slate-100"
                                onMouseDown={() => {
                                    onSelect({ id: 0, name: dict?.Common?.CashCustomer || "عميل نقدي" });
                                    setOpen(false);
                                }}
                            >
                                {dict?.Common?.CashCustomer || "عميل نقدي"} (إفتراضي)
                            </div>
                        )}
                    </div>
                </div>
            )}

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </div>
    );
}
