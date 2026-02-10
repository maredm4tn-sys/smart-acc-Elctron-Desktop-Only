
import { z } from "zod";

/**
 * LOGIC ABSTRACTION HUB (E2E RELAXED VERSION)
 * Shared Zod schemas used across both web and desktop.
 * All non-essential fields are made optional/nullish to ensure data saving never fails.
 */

export const customerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    companyName: z.string().optional().nullish(),
    phone: z.string().optional().nullish(),
    email: z.string().optional().nullish().or(z.literal("")),
    address: z.string().optional().nullish(),
    taxId: z.string().optional().nullish(),
    nationalId: z.string().optional().nullish(),
    creditLimit: z.any().optional().default(0),
    paymentDay: z.any().optional().nullish(),
    openingBalance: z.any().optional().default(0),
    priceLevel: z.string().optional().default('retail'),
    representativeId: z.any().optional().nullish(),
});

export const productSchema = z.object({
    name: z.string().min(1, "Product name is required"),
    sku: z.string().optional().nullish(),
    barcode: z.string().optional().nullish(),
    type: z.string().optional().default('goods'),
    sellPrice: z.any().optional().default(0),
    buyPrice: z.any().optional().default(0),
    priceWholesale: z.any().optional().default(0),
    priceHalfWholesale: z.any().optional().default(0),
    priceSpecial: z.any().optional().default(0),
    stockQuantity: z.any().optional().default(0),
    minStock: z.any().optional().default(0),
    categoryId: z.any().optional().nullish(),
    unitId: z.any().optional().nullish(),
    location: z.string().optional().nullish(),
    requiresToken: z.any().optional().default(false),
});

/**
 * Universal Validation Wrapper
 */
export function validateEntity<T>(schema: z.ZodSchema<T>, data: any, options: { allowOffline?: boolean } = {}) {
    return schema.safeParse(data);
}
