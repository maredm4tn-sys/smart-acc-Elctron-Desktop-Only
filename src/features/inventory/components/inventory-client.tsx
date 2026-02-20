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
import { exportToExcel } from "@/lib/export-excel";
import { ArrowLeftRight, ArrowRightLeft } from "lucide-react";

import { AddProductDialog } from "@/features/inventory/components/add-product-dialog";
import { BulkUploadDialog } from "@/features/inventory/components/bulk-upload-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Warehouse } from "lucide-react";

export function InventoryClient({ initialProducts, dict }: { initialProducts: any[], dict: any }) {
    const { numeralSystem } = useSettings();
    const [products, setProducts] = useState(initialProducts);
    const [isOffline, setIsOffline] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        // Sync online data to local mirror if online
        if (navigator.onLine && (initialProducts?.length || 0) > 0) {
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
        <div className="space-y-6 animate-in fade-in duration-500 pb-10" dir={dict.Common.Direction}>
            {/* Standard Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="w-full">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-800">{dict.Inventory.Title}</h1>
                    <p className="text-slate-500 mt-1">{dict.Inventory.Description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-end">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportToExcel(products, 'Inventory', 'InventoryList')}
                        className="bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold gap-2 shadow-sm rounded-xl h-10 px-4"
                    >
                        <ArrowRightLeft className="h-4 w-4 text-blue-600" />
                        <span className="hidden sm:inline">{dict.Inventory?.ExportExcel || dict.Common?.ExportExcel}</span>
                    </Button>
                    <BulkUploadDialog />
                    <AddProductDialog triggerLabel={dict.Inventory.NewItem} />
                </div>
            </div>

            {isOffline && (
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-center justify-start gap-3 text-amber-700 shadow-sm animate-pulse">
                    <CloudOff size={18} />
                    <span className="text-sm font-medium">{dict.Common.Offline.NoConnection}</span>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
                <div className="relative flex-1">
                    <Search className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={dict.Inventory.SearchPlaceholder || `${dict.Common.Search}...`}
                        className="pr-8 h-10 border-slate-200 focus:border-blue-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block rounded-md border text-sm overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow>
                            <TableHead className="text-start font-black w-[120px]">{dict.Inventory.Table.SKU}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.Product}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.Type}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.BuyPrice}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.SellPrice}</TableHead>
                            <TableHead className="text-start font-black">{dict.Inventory.Table.Stock}</TableHead>
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
                                    <TableCell className="text-start">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${product.type === 'goods' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-purple-50 text-purple-600 border border-purple-100'}`}>
                                            {product.type === 'goods' ? dict.Inventory.Table.Goods : dict.Inventory.Table.Service}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-start font-mono text-slate-600">{formatNumber((Number(product.buyPrice) || 0).toFixed(2), numeralSystem as any)}</TableCell>
                                    <TableCell className="text-start font-black text-green-700 font-mono">{formatNumber((Number(product.sellPrice) || 0).toFixed(2), numeralSystem as any)}</TableCell>
                                    <TableCell className="text-start">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <div className="flex flex-col items-start justify-center cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                                    <span className={cn(
                                                        "font-black text-sm",
                                                        (Number(product.stockQuantity) || 0) <= 0 && product.type === 'goods' ? "text-red-500" : "text-slate-900"
                                                    )}>
                                                        <Num value={product.stockQuantity || "0"} />
                                                    </span>
                                                    <span className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1">
                                                        <Warehouse size={10} />
                                                        {dict.Inventory?.Table?.Stock}
                                                    </span>
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-4 rounded-[1.5rem] shadow-xl border-slate-100" align="start">
                                                <h4 className="font-black text-slate-800 mb-3 flex items-center gap-2">
                                                    <Warehouse size={16} className="text-emerald-600" />
                                                    {dict.Inventory?.Warehouses?.StockPerWarehouse}
                                                </h4>
                                                <div className="space-y-2">
                                                    {product.stockLevels?.length > 0 ? (
                                                        product.stockLevels.map((sl: any) => (
                                                            <div key={sl.id} className="flex justify-between items-center text-sm font-bold border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                                                                <span className="text-slate-600 font-arabic">{sl.warehouse?.name}</span>
                                                                <span className="text-slate-900"><Num value={sl.quantity} /></span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-xs text-slate-400 italic">No warehouse data.</p>
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
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
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <span className={cn(
                                                "cursor-pointer flex items-center gap-1 font-semibold",
                                                (Number(product.stockQuantity) || 0) <= 0 && product.type === 'goods' ? "text-red-500" : ""
                                            )}>
                                                {formatNumber(product.stockQuantity || "0", numeralSystem as any)}
                                                <Warehouse size={10} className="text-slate-300" />
                                            </span>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-56 p-4 rounded-2xl shadow-xl">
                                            <div className="space-y-2">
                                                {product.stockLevels?.map((sl: any) => (
                                                    <div key={sl.id} className="flex justify-between text-xs font-bold">
                                                        <span>{sl.warehouse?.name}</span>
                                                        <span>{sl.quantity}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </PopoverContent>
                                    </Popover>
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
