"use server";

import { db, withErrorHandling } from "@/db";
import { warehouses, stockLevels, products } from "@/db/schema";
import { requireSession } from "@/lib/tenant-security";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDictionary } from "@/lib/i18n-server";

async function getInvDict() {
    return await getDictionary();
}

/**
 * 🛠️ [SERVER ACTION] getWarehouses
 */
export async function getWarehouses() {
    try {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        return await db.select().from(warehouses).where(eq(warehouses.tenantId, tenantId));
    } catch (e) {
        return [];
    }
}

/**
 * 🛠️ [SERVER ACTION] seedDefaultWarehouse
 * Creates a "Main Warehouse" if none exists.
 */
export async function seedDefaultWarehouse() {
    return await withErrorHandling("seedDefaultWarehouse", async () => {
        const { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        const dict = (await getInvDict()) as any;

        const existing = await db.select().from(warehouses)
            .where(eq(warehouses.tenantId, tenantId))
            .limit(1);

        if (existing.length === 0) {
            // Check if we are in Postgres or SQLite for returning
            const [newWh] = await db.insert(warehouses).values({
                tenantId,
                name: dict.Inventory?.Warehouses?.MainWarehouse,
                isDefault: true,
                location: "Default"
            }).returning();

            // Link existing products to this warehouse
            const allProducts = await db.select().from(products).where(eq(products.tenantId, tenantId));
            for (const p of allProducts) {
                await db.insert(stockLevels).values({
                    tenantId,
                    productId: p.id,
                    warehouseId: newWh.id,
                    quantity: p.stockQuantity || "0.00"
                });
            }

            revalidatePath("/dashboard/inventory");
            return { success: true, message: "Default warehouse created and stock linked." };
        }

        return { success: true, message: "Warehouse already exists." };
    });
}

/**
 * 🛠️ [SERVER ACTION] createWarehouse
 */
export async function createWarehouse(data: { name: string; location?: string; isDefault?: boolean }) {
    return await withErrorHandling("createWarehouse", async () => {
        const { tenantId } = await requireSession();

        if (data.isDefault) {
            // Unset other defaults
            await db.update(warehouses).set({ isDefault: false }).where(eq(warehouses.tenantId, tenantId));
        }

        const [newWh] = await db.insert(warehouses).values({
            tenantId,
            name: data.name,
            location: data.location || null,
            isDefault: data.isDefault || false
        }).returning();

        revalidatePath("/dashboard/inventory");
        return newWh;
    });
}

/**
 * 🛠️ [SERVER ACTION] updateWarehouse
 */
export async function updateWarehouse(data: { id: number; name: string; location?: string; isDefault?: boolean }) {
    return await withErrorHandling("updateWarehouse", async () => {
        const { tenantId } = await requireSession();

        if (data.isDefault) {
            await db.update(warehouses).set({ isDefault: false }).where(eq(warehouses.tenantId, tenantId));
        }

        await db.update(warehouses).set({
            name: data.name,
            location: data.location || null,
            isDefault: data.isDefault || false
        }).where(and(eq(warehouses.id, data.id), eq(warehouses.tenantId, tenantId)));

        revalidatePath("/dashboard/inventory");
        return { success: true };
    });
}

/**
 * 🛠️ [SERVER ACTION] deleteWarehouse
 */
export async function deleteWarehouse(id: number) {
    return await withErrorHandling("deleteWarehouse", async () => {
        const { tenantId } = await requireSession();

        // Don't allow deleting the only warehouse or default?
        // For now, simple delete
        await db.delete(warehouses).where(and(eq(warehouses.id, id), eq(warehouses.tenantId, tenantId)));

        revalidatePath("/dashboard/inventory");
        return { success: true };
    });
}

/**
 * 🛠️ [SERVER ACTION] getStockByWarehouse
 */
export async function getStockByWarehouse(productId: number) {
    try {
        const { tenantId } = await requireSession();
        return await db.select({
            warehouseName: warehouses.name,
            quantity: stockLevels.quantity,
            warehouseId: warehouses.id
        })
            .from(stockLevels)
            .innerJoin(warehouses, eq(stockLevels.warehouseId, warehouses.id))
            .where(and(eq(stockLevels.productId, productId), eq(stockLevels.tenantId, tenantId)));
    } catch (e) {
        return [];
    }
}
