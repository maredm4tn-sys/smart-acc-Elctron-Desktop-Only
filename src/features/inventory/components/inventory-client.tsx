"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Package, Search, CloudOff, RefreshCw, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EditProductDialog } from "@/features/inventory/components/edit-product-dialog";
import { BarcodePrintDialog } from "@/features/inventory/components/barcode-print-dialog";
import { deleteProduct } from "@/features/inventory/actions";
import { mirrorData, getLocalData, STORES } from "@/lib/offline-db";
import { toast } from "sonner";
import { useSettings } from "@/components/providers/settings-provider";
import { Num } from "@/components/ui/num";
import { formatNumber } from "@/lib/numbers";
import { eq, or, isNull } from "drizzle-orm";
import { cn } from "@/lib/utils";

export function InventoryClient({ initialProducts, dict }: { initialProducts: any[], dict: any }) {
    const { numeralSystem } = useSettings();
    const [products, setProducts] = useState(initialProducts);
    const [isOffline, setIsOffline] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Sync online data to local mirror if online
        if (navigator.onLine && initialProducts.length > 0) {
            mirrorData(STORES.PRODUCTS, initialProducts);
        }

        const handleOnline = () => {
            setIsOffline(false);
            window.location.reload(); // Refresh to get latest data
        };
        const handleOffline = () => {
            setIsOffline(true);
            loadLocalData();
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (!navigator.onLine) {
            handleOffline();
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [initialProducts]);

    const loadLocalData = async () => {
        const local = await getLocalData(STORES.PRODUCTS);
        if (local.length > 0) {
            setProducts(local);
            toast.info(dict.Common.Offline.WorkingOffline);
        }
    };

    const [isDeleting, setIsDeleting] = useState<number | null>(null);

    const handleDeleteProduct = async (id: number) => {
        if (!confirm(dict.Dialogs.DeleteConfirm)) return;

        setIsDeleting(id);
        try {
            const res = await deleteProduct(id);
            if (res.success) {
                toast.success(res.message);
                setProducts(prev => prev.filter(p => p.id !== id));
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Common.Error);
        } finally {
            setIsDeleting(null);
        }
    };

    const filteredProducts = (products || []).filter(p => {
        const nameMatch = (p.name || "").toLowerCase().includes(searchQuery.toLowerCase());
        const skuMatch = (p.sku || "").toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || skuMatch;
    });

    return (
        <div className="bg-white p-3 md:p-4 rounded-xl border shadow-sm space-y-4" dir={dict.Common.Direction || "rtl"}>
            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-end gap-3 text-amber-700 text-sm shadow-sm animate-pulse">
                    <span>{dict.Common.Offline.NoConnection}</span>
                    <CloudOff size={18} />
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <div className="relative flex-1">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={dict.Inventory.SearchPlaceholder || `${dict.Common.Search}...`}
                        className="pr-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <Button variant="outline" className="w-full sm:w-auto">{dict.Common.Search}</Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border text-sm overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="text-start font-black w-[120px]">{dict.Inventory.Table.SKU}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.Product}</TableHead>
                            <TableHead className="text-center font-black">{dict.Inventory.Table.Type}</TableHead>
                            <TableHead className="text-end font-black">{dict.Inventory.Table.BuyPrice}</TableHead>
                            <TableHead className="text-end font-black">{dict.Inventory.Table.SellPrice}</TableHead>
                            <TableHead className="text-end font-black">{dict.Inventory.Table.Stock}</TableHead>
                            <TableHead className="text-start font-black px-6">{dict.Inventory.Table.Actions}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProducts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center text-slate-400 font-bold italic">
                                    {dict.Inventory.Table.NoProducts}
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProducts.map((product, index) => (
                                <TableRow key={product.id || `prod-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-mono text-slate-500 text-xs px-4 text-start">
                                        <Num value={product.sku} />
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900 text-start">
                                        <div className="flex items-center gap-2">
                                            <Package className="h-4 w-4 text-blue-400 shrink-0" />
                                            <span>{product.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${product.type === 'goods' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                            {product.type === 'goods' ? dict.Inventory.Table.Goods : dict.Inventory.Table.Service}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-end font-mono text-slate-600">{formatNumber((Number(product.buyPrice) || 0).toFixed(2), numeralSystem as any)}</TableCell>
                                    <TableCell className="text-end font-black text-green-700 font-mono">{formatNumber((Number(product.sellPrice) || 0).toFixed(2), numeralSystem as any)}</TableCell>
                                    <TableCell className="text-end">
                                        <div className="flex flex-col items-end justify-center">
                                            <span className={cn(
                                                "font-black text-sm",
                                                (Number(product.stockQuantity) || 0) <= 0 && product.type === 'goods' ? "text-red-500" : "text-slate-900"
                                            )}>
                                                <Num value={product.stockQuantity || "0"} />
                                            </span>
                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{dict.Inventory?.Table?.Stock || "المخزون"}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-start px-6">
                                        <div className="flex items-center justify-start gap-2">
                                            <BarcodePrintDialog product={product} />
                                            <EditProductDialog product={product} />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                onClick={() => handleDeleteProduct(product.id)}
                                                disabled={isDeleting === product.id}
                                            >
                                                {isDeleting === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4">
                {filteredProducts.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">{dict.Inventory.Table.NoProducts}</div>
                ) : (
                    filteredProducts.map((product, index) => (
                        <div key={product.id || `card-${index}`} className="p-4 border rounded-lg shadow-sm bg-white space-y-3">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold flex items-center gap-2">
                                        <Package size={16} className="text-primary" />
                                        {product.name}
                                    </div>
                                    <div className="text-sm text-muted-foreground mt-1">{dict.Inventory.Table.SKU}: {product.sku}</div>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs ${product.type === 'goods' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                    {product.type === 'goods' ? dict.Inventory.Table.Goods : dict.Inventory.Table.Service}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block text-xs">{dict.Inventory.Table.SellPrice}</span>
                                    <span className="font-semibold text-green-600">{formatNumber((Number(product.sellPrice) || 0).toFixed(2), numeralSystem as any)}</span>
                                </div>
                                <div className="bg-slate-50 p-2 rounded">
                                    <span className="text-muted-foreground block text-xs">{dict.Inventory.Table.Stock}</span>
                                    <span className={(Number(product.stockQuantity) || 0) <= 0 && product.type === 'goods' ? "text-red-500 font-bold" : "font-semibold"}>
                                        {formatNumber(product.stockQuantity || "0", numeralSystem as any)}
                                    </span>
                                </div>
                            </div>
                            <div className="flex justify-end pt-2 border-t gap-2">
                                <BarcodePrintDialog product={product} />
                                <EditProductDialog product={product} />
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteProduct(product.id)}
                                    disabled={isDeleting === product.id}
                                >
                                    {isDeleting === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
