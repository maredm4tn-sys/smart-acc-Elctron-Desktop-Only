"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { toast } from "sonner";
import { useShift } from "@/features/shifts/context/shift-context";
import { useTranslation } from "@/components/providers/i18n-provider";
import { useSettings } from "@/components/providers/settings-provider";

// --- Types ---
export type Unit = {
    id: number;
    name: string;
}

export type Product = {
    id: number;
    name: string;
    sku: string;
    barcode?: string;
    sellPrice: number;
    priceWholesale: number;
    priceHalfWholesale: number;
    priceSpecial: number;
    buyPrice: number;
    stockQuantity: number;
    minStock: number;
    unitId?: number;
    unit?: Unit;
    type: 'goods' | 'service';
};

export type CartItem = {
    id: string; // unique ID for cart item
    productId: number;
    name: string;
    sku: string;
    price: number;
    originalPrice: number; // For reference
    qty: number;
    discount: number; // Value
    unitId?: number;
    storeId?: number;
    notes?: string;
    stock: number;
    isReturn?: boolean;
};

export type PriceType = 'retail' | 'wholesale' | 'half_wholesale' | 'special';

export type InvoiceHeader = {
    customerId: number;
    customerName: string;
    storeId: number;
    priceType: PriceType;
    date: Date;
    dueDate?: Date;
    salesRepId?: number;
    notes?: string;
    paymentMethod: 'cash' | 'credit' | 'card' | 'multi';
};

export type InvoiceTotals = {
    subtotal: number;
    discountAmount: number;
    discountPercent: number;
    taxAmount: number;
    taxRate: number;
    deliveryFee: number;
    total: number;
    net: number;
    paid: number;
    remaining: number;
};

// --- Context State ---
type POSContextType = {
    items: CartItem[];
    header: InvoiceHeader;
    totals: InvoiceTotals;
    products: Product[];
    customers: any[];
    activeShift: any | null;
    isLoading: boolean;
    isSuspendedMode: boolean;
    settings: {
        directAdd: boolean;
        autoPrint: boolean;
        showImages: boolean;
        printLayout: 'standard' | 'thermal';
        numeralSystem: 'latn' | 'arab';
        taxEnabled?: boolean;
        taxRate?: number;
    };
    setSettings: (updates: Partial<POSContextType['settings']>) => void;
    addToCart: (product: Product, qty?: number) => void;
    updateItem: (id: string, updates: Partial<CartItem>) => void;
    removeFromCart: (id: string) => void;
    clearCart: () => void;
    setHeader: (updates: Partial<InvoiceHeader>) => void;
    setTotals: (updates: Partial<InvoiceTotals>) => void;
    refreshProducts: () => Promise<void>;
    suspendInvoice: () => Promise<void>;
    checkout: () => Promise<{ success: boolean; id?: number }>;
};

const POSContext = createContext<POSContextType | undefined>(undefined);

export function POSProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [header, setHeader] = useState<InvoiceHeader>({
        customerId: 0,
        customerName: "عميل نقدي",
        storeId: 1,
        priceType: 'retail',
        date: new Date(),
        paymentMethod: 'cash'
    });
    const [totals, setTotals] = useState<InvoiceTotals>({
        subtotal: 0,
        discountAmount: 0,
        discountPercent: 0,
        taxAmount: 0,
        taxRate: 0,
        deliveryFee: 0,
        total: 0,
        net: 0,
        paid: 0,
        remaining: 0
    });
    const [products, setProducts] = useState<Product[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const { activeShift, checkActiveShift } = useShift();
    const [isLoading, setIsLoading] = useState(false);
    const [isSuspendedMode, setIsSuspendedMode] = useState(false);
    const [settings, setSettings] = useState({
        directAdd: false,
        autoPrint: true,
        showImages: false,
        printLayout: 'thermal' as 'standard' | 'thermal',
        numeralSystem: 'latn' as 'latn' | 'arab',
        taxEnabled: false,
        taxRate: 14
    });

    const { dict } = useTranslation() as any;
    const { currency: globalCurrency, numeralSystem: globalNumeralSystem, taxEnabled: globalTaxEnabled, taxRate: globalTaxRate } = useSettings();

    useEffect(() => {
        setSettings(prev => ({
            ...prev,
            numeralSystem: (globalNumeralSystem as any) || prev.numeralSystem,
            taxEnabled: globalTaxEnabled ?? prev.taxEnabled,
            taxRate: globalTaxRate ?? prev.taxRate
        }));
    }, [globalNumeralSystem, globalTaxEnabled, globalTaxRate]);

    useEffect(() => {
        const sub = items.reduce((acc, item) => acc + (item.price * item.qty - item.discount), 0);
        const billDiscount = totals.discountAmount + (totals.discountPercent > 0 ? (sub * totals.discountPercent / 100) : 0);
        const afterDiscount = Math.max(0, sub - billDiscount);
        const tax = totals.taxAmount + (totals.taxRate > 0 ? (afterDiscount * totals.taxRate / 100) : 0);
        const totalFinal = afterDiscount + tax + Number(totals.deliveryFee);

        setTotals(prev => ({
            ...prev,
            subtotal: sub,
            total: totalFinal,
            remaining: Math.max(0, totalFinal - prev.paid)
        }));
    }, [items, totals.discountAmount, totals.discountPercent, totals.taxAmount, totals.taxRate, totals.deliveryFee, totals.paid]);

    useEffect(() => {
        if (items.length === 0 || products.length === 0) return;
        let changed = false;
        const newItems = items.map(item => {
            const product = products.find(p => p.id === item.productId);
            if (!product) return item;

            let newPrice = product.sellPrice;
            if (header.priceType === 'wholesale') newPrice = product.priceWholesale;
            else if (header.priceType === 'half_wholesale') newPrice = product.priceHalfWholesale;
            else if (header.priceType === 'special') newPrice = product.priceSpecial;

            if (newPrice === 0 && header.priceType !== 'retail') newPrice = product.sellPrice;

            if (item.price !== newPrice) {
                changed = true;
                return { ...item, price: newPrice, originalPrice: newPrice };
            }
            return item;
        });

        if (changed) {
            setItems(newItems);
            toast.info(dict?.POS?.PricesUpdated);
        }
    }, [header.priceType, products, items.length]);

    const addToCart = useCallback((product: Product, qty: number = 1) => {
        let startPrice = product.sellPrice;
        if (header.priceType === 'wholesale') startPrice = product.priceWholesale;
        if (header.priceType === 'half_wholesale') startPrice = product.priceHalfWholesale;
        if (header.priceType === 'special') startPrice = product.priceSpecial;
        if (startPrice === 0 && header.priceType !== 'retail') startPrice = product.sellPrice;

        setItems(prev => {
            const existing = prev.find(i => i.productId === product.id);
            if (existing) {
                return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + qty } : i);
            }
            return [...prev, {
                id: crypto.randomUUID(),
                productId: product.id,
                name: product.name,
                sku: product.sku,
                price: startPrice,
                originalPrice: startPrice,
                qty: qty,
                discount: 0,
                stock: product.stockQuantity,
                unitId: product.unitId
            }];
        });
    }, [header.priceType]);

    const updateItem = useCallback((id: string, updates: Partial<CartItem>) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    }, []);

    const removeFromCart = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    const clearCart = useCallback(() => {
        setItems([]);
        setTotals(prev => ({ ...prev, paid: 0, discountAmount: 0 }));
    }, []);

    const loadCustomers = async () => {
        try {
            const { getCustomers } = await import("@/features/customers/actions");
            const data = await getCustomers();
            if (Array.isArray(data)) {
                setCustomers(data);
            } else {
                setCustomers([]);
            }
        } catch (e) {
            console.error("Failed to load customers", e);
            setCustomers([]);
        }
    };

    const refreshProducts = async () => {
        setIsLoading(true);
        try {
            const { getProducts } = await import("@/features/inventory/actions");
            const data = await getProducts();
            if (Array.isArray(data)) {
                const mapped = data.map((p: any) => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    barcode: p.barcode,
                    sellPrice: Number(p.sellPrice || 0),
                    priceWholesale: Number(p.priceWholesale || 0),
                    priceHalfWholesale: Number(p.priceHalfWholesale || 0),
                    priceSpecial: Number(p.priceSpecial || 0),
                    buyPrice: Number(p.buyPrice || 0),
                    stockQuantity: Number(p.stockQuantity || 0),
                    minStock: Number(p.minStock || 0),
                    unitId: p.unitId,
                    type: p.type
                }));
                setProducts(mapped);
            }
        } catch (e) {
            toast.error("Failed to load products");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        refreshProducts();
        loadCustomers();
        checkActiveShift();
    }, [checkActiveShift]);

    const checkout = async () => {
        if (items.length === 0) {
            toast.error("Cart is empty");
            return { success: false };
        }
        setIsLoading(true);
        try {
            const { createInvoice } = await import("@/features/sales/actions");
            const result = await createInvoice({
                customerId: header.customerId === 0 ? null : header.customerId,
                customerName: header.customerName ,
                storeId: header.storeId,
                priceType: header.priceType,
                paymentMethod: header.paymentMethod,
                issueDate: header.date.toISOString().split('T')[0],
                items: items.map(item => ({
                    productId: item.productId,
                    description: item.name,
                    quantity: item.qty,
                    unitPrice: item.price,
                    discount: item.discount,
                    unitId: item.unitId,
                    storeId: header.storeId
                })),
                includeTax: totals.taxRate > 0,
                discountAmount: totals.discountAmount,
                discountPercent: totals.discountPercent,
                deliveryFee: totals.deliveryFee,
                initialPayment: totals.paid,
                currency: globalCurrency || "EGP",
                exchangeRate: 1,
            } as any);

            if (result.success) {
                toast.success(dict?.POS?.InvoiceSavedSuccess?.replace('{id}', `#${result.id}`) || `Invoice #${result.id} saved successfully`);
                clearCart();
                return { success: true, id: result.id };
            } else {
                toast.error(result.message );
                return { success: false };
            }
        } catch (error) {
            toast.error("Connection error");
            return { success: false };
        } finally {
            setIsLoading(false);
        }
    };

    const suspendInvoice = async () => {
        toast.info("Invoice suspended");
        clearCart();
    };

    return (
        <POSContext.Provider value={{
            items, header, totals, products, customers, activeShift, isLoading, isSuspendedMode, settings,
            setSettings: (updates: any) => setSettings(prev => ({ ...prev, ...updates })),
            addToCart, updateItem, removeFromCart, clearCart,
            setHeader: (updates) => setHeader(prev => ({ ...prev, ...updates })),
            setTotals: (updates) => setTotals(prev => ({ ...prev, ...updates })),
            refreshProducts, suspendInvoice, checkout
        }}>
            {children}
        </POSContext.Provider>
    );
}

export const usePOS = () => {
    const context = useContext(POSContext);
    if (!context) throw new Error("usePOS must be used within a POSProvider");
    return context;
}
