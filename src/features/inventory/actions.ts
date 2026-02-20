"use server";

import { db, withErrorHandling } from "@/db";
import { products, categories, units } from "@/db/schema";
import { requireSession } from "@/lib/tenant-security";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/lib/i18n-server";

async function getInvDict() {
    return await getDictionary();
}
import { productSchema, validateEntity } from "@/lib/validations";

// --- Products ---

export async function getProducts() {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const data = await db.query.products.findMany({
            where: (products: any, { eq }: any) => eq(products.tenantId, tenantId),
            with: {
                stockLevels: {
                    with: {
                        warehouse: true
                    }
                },
                category: true,
                unit: true
            },
            orderBy: (products: any, { desc }: any) => [desc(products.createdAt)]
        });
        return data as any[];
    } catch (e: any) {
        logToDesktop(`❌ [getProducts] Error: ${e.message}`, 'error');
        return [];
    }
}

export async function createProduct(inputData: any) {
    const result = await withErrorHandling("createProduct", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const dict = await getInvDict();

        const validation = validateEntity(productSchema, inputData, { allowOffline: true });
        if (!validation.success) {
            throw new Error(JSON.stringify((validation as any).error.flatten()));
        }
        const data = validation.data;

        // --- Uniqueness Checks (Offline Friendly) ---
        if (data.sku) {
            const existingSku = await db.select().from(products)
                .where(and(eq(products.tenantId, tenantId), eq(products.sku, data.sku)))
                .limit(1);
            if (existingSku.length > 0) throw new Error(dict.Inventory.ProductForm.DuplicateSKU);
        }

        if (data.barcode) {
            const existingBarcode = await db.select().from(products)
                .where(and(eq(products.tenantId, tenantId), eq(products.barcode, data.barcode)))
                .limit(1);
            if (existingBarcode.length > 0) throw new Error(dict.Inventory.ProductForm.DuplicateBarcode);
        }

        // --- 2. Full Data Insertion ---
        const [newProduct] = await db.insert(products).values({
            tenantId,
            name: data.name,
            sku: data.sku || `SKU-${Date.now()}`,
            barcode: data.barcode || null,
            type: data.type || 'goods',
            sellPrice: String(data.sellPrice || 0),
            buyPrice: String(data.buyPrice || 0),
            priceWholesale: String(data.priceWholesale || 0),
            priceHalfWholesale: String(data.priceHalfWholesale || 0),
            priceSpecial: String(data.priceSpecial || 0),
            stockQuantity: String(data.stockQuantity || 0),
            minStock: data.minStock || 0,
            location: data.location || null,
            requiresToken: data.requiresToken ? true : false,
            categoryId: data.categoryId || null,
            unitId: data.unitId || null,
        }).returning();

        // --- 3. Multi-Warehouse Support: Link to Warehouse ---
        const { warehouses, stockLevels } = await import("@/db/schema");

        let targetWhId = data.warehouseId;
        if (!targetWhId) {
            const [defaultWh] = await db.select().from(warehouses)
                .where(and(eq(warehouses.tenantId, tenantId), eq(warehouses.isDefault, true)))
                .limit(1);
            if (defaultWh) targetWhId = defaultWh.id;
        }

        if (targetWhId) {
            await db.insert(stockLevels).values({
                tenantId,
                productId: newProduct.id,
                warehouseId: Number(targetWhId),
                quantity: String(data.stockQuantity || 0)
            });
        }

        revalidatePath('/dashboard/inventory');
        return newProduct;
    });

    const dict = await getInvDict();
    return result.success ? { success: true, data: result.data, message: dict.Inventory.ProductForm.CreateSuccess } : { success: false, message: result.message };
}

export async function updateProduct(data: any) {
    const result = await withErrorHandling("updateProduct", async () => {
        let { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        await db.update(products).set({ ...data }).where(and(eq(products.id, data.id), eq(products.tenantId, tenantId)));
        revalidatePath('/dashboard/inventory');
        const dict = await getInvDict();
        return dict.Common.UpdateSuccess;
    });
    return result.success ? { success: true, message: result.data } : { success: false, message: result.message };
}

export async function deleteProduct(id: number) {
    const result = await withErrorHandling("deleteProduct", async () => {
        let { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        await db.delete(products).where(and(eq(products.id, id), eq(products.tenantId, tenantId)));
        revalidatePath('/dashboard/inventory');
        const dict = await getInvDict();
        return dict.Common.DeleteSuccess;
    });
    return result.success ? { success: true, message: result.data } : { success: false, message: result.message };
}

// --- Bulk Ops ---


/**
 * 🛠️ [DEBUG LOGGER]
 */
function logToDesktop(message: string, level: 'info' | 'error' = 'info') {
    if (typeof window !== 'undefined') return;
    try {
        const _require = eval('require');
        const fs = _require('fs');
        const path = _require('path');
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.local', 'share'));
        const logPath = path.join(appData, 'smart-acc-electron-desktop-only', 'import_debug.log');

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (e) { }
}


export async function bulkImportProducts(productsList: any[]) {
    const result = await withErrorHandling("bulkImportProducts", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        let count = 0;

        const dict = await getInvDict();

        // Helper for flexible field mapping - EXPANDED
        const m = {
            name: [dict.Inventory.ProductForm.Name, "Name", "name", "اسم الصنف", "الاسم", "الصنف", "المنتج", "product", "item"],
            sku: [dict.Inventory.ProductForm.SKU, "SKU", "sku", "الكود", "كود الصنف", "رقم الصنف", "code"],
            barcode: [dict.Inventory.ProductForm.Barcode, "Barcode", "barcode", "الباركود", "باركود"],
            sellPrice: [dict.Inventory.ProductForm.SellPrice, "Sell Price", "sell_price", "سعر البيع", "سعر بيع", "بيع", "price", "sell"],
            buyPrice: [dict.Inventory.ProductForm.BuyPrice, "Buy Price", "buy_price", "سعر الشراء", "سعر شراء", "شراء", "التكلفة", "cost", "buy"],
            stock: [dict.Inventory.ProductForm.Stock, "Stock", "quantity", "qty", "stock", "الكمية", "الرصيد", "المخزون", "الرصيد الافتتاحي", "مخزن"],
            minStock: [dict.Inventory.ProductForm.MinStock, "Min Stock", "min_stock", "حد الطلب", "اقل كمية"],
            location: [dict.Inventory.ProductForm.Shelf, "Location", "shelf", "الموقع", "الرف", "مكان التخزين"]
        };

        const find = (raw: any, keys: string[]) => {
            for (const k of keys) {
                // Try exact match first
                if (raw[k] !== undefined) return raw[k];
                // Try fuzzy match (ignore case/space)
                const match = Object.keys(raw).find(rk => {
                    const cleanK = k.toLowerCase().trim();
                    const cleanRK = rk.toLowerCase().trim();
                    return cleanRK === cleanK || cleanRK.includes(cleanK) || cleanK.includes(cleanRK);
                });
                if (match !== undefined) return raw[match];
            }
            return undefined;
        };

        const cleanNum = (val: any) => {
            if (val === undefined || val === null || val === "") return "0";
            if (typeof val === "number") return String(val);
            // Remove any non-numeric chars except dot
            const cleaned = String(val).replace(/[^0-9.]/g, "");
            return cleaned || "0";
        };

        // Direct DB Insertion Loop
        for (const raw of productsList) {
            try {
                const name = find(raw, m.name);
                if (!name) continue;

                const sku = find(raw, m.sku) || `SKU-${Date.now()}-${Math.random().toString(36).substring(7)}`;

                // Check if SKU already exists
                const existing = await db.select().from(products)
                    .where(and(eq(products.tenantId, tenantId), eq(products.sku, String(sku))))
                    .limit(1);

                if (existing.length > 0) {
                    logToDesktop(`⚠️ [SKIP] SKU already exists: ${sku}`);
                    continue;
                }

                await db.insert(products).values({
                    tenantId,
                    name: String(name),
                    sku: String(sku),
                    barcode: find(raw, m.barcode) ? String(find(raw, m.barcode)) : null,
                    sellPrice: cleanNum(find(raw, m.sellPrice)),
                    buyPrice: cleanNum(find(raw, m.buyPrice)),
                    stockQuantity: cleanNum(find(raw, m.stock)),
                    minStock: Number(cleanNum(find(raw, m.minStock))),
                    type: 'goods',
                    location: find(raw, m.location) ? String(find(raw, m.location)) : null
                });
                count++;
            } catch (err: any) {
                logToDesktop(`❌ [INSERT_FAIL] ${JSON.stringify(raw)}: ${err.message}`, 'error');
            }
        }

        logToDesktop(`🏁 [BULK_PRODUCTS_END] Successfully imported ${count} products.`);
        revalidatePath('/dashboard/inventory');
        return dict.Inventory.Import.Success.replace("{count}", count.toString());
    });
    return result.success ? { success: true, message: result.data } : { success: false, message: result.message };
}

// --- Helpers (Categories & Units) ---

export async function getCategories() {
    try {
        const { tenantId } = await requireSession();
        const data = await db.select().from(categories).where(eq(categories.tenantId, tenantId));
        return data;
    } catch { return []; }
}

export async function createCategory(name: string) {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const dict = await getInvDict();
        await db.insert(categories).values({ tenantId, name });
        revalidatePath('/dashboard/inventory');
        return { success: true, message: dict.Common.AddSuccess };
    } catch {
        const dict = await getInvDict();
        return { success: false, message: dict.Common.AddError };
    }
}

export async function getUnits() {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const data = await db.select().from(units).where(eq(units.tenantId, tenantId));
        return data;
    } catch { return []; }
}

export async function createUnit(name: string) {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const dict = await getInvDict();
        await db.insert(units).values({ tenantId, name });
        revalidatePath('/dashboard/inventory');
        return { success: true, message: dict.Common.AddSuccess };
    } catch {
        const dict = await getInvDict();
        return { success: false, message: dict.Common.AddError };
    }
}

export async function deleteCategory(id: number) {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        await db.delete(categories).where(and(eq(categories.id, id), eq(categories.tenantId, tenantId)));
        revalidatePath('/dashboard/inventory');
        const dict = await getInvDict();
        return { success: true, message: dict.Common.DeleteSuccess };
    } catch {
        const dict = await getInvDict();
        return { success: false, message: dict.Common.DeleteError };
    }
}

export async function deleteUnit(id: number) {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        await db.delete(units).where(and(eq(units.id, id), eq(units.tenantId, tenantId)));
        revalidatePath('/dashboard/inventory');
        const dict = await getInvDict();
        return { success: true, message: dict.Common.DeleteSuccess };
    } catch {
        const dict = await getInvDict();
        return { success: false, message: dict.Common.DeleteError };
    }
}
