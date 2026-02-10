import { db } from "@/db";
import { tenants } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function getActiveTenantId(providedId?: string): Promise<string> {

    // Check if providedId is a valid UUID (simple regex check)
    const isValidUUID = providedId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(providedId);

    if (isValidUUID) {
        // Opt: verify it exists
        return providedId;
    }

    // -------------------------------------------------------------------------
    // UNIFIED DESKTOP TENANT IDENTIFICATION
    // -------------------------------------------------------------------------
    // In Desktop mode, we always use a fixed tenant ID to ensure consistency 
    // across all parts of the application (Bulk Import, Manual Entry, and UI Fetching).
    return "tenant_default";
}
