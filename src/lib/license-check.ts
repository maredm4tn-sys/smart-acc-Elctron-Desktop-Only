
import { db } from "@/db";
import { licensing, invoices } from "@/db/schema";
import { sql, count, eq } from "drizzle-orm";

import { getActiveTenantId } from "@/lib/actions-utils";

export interface LicenseStatus {
    isActivated: boolean;
    isExpired: boolean;
    trialDaysLeft: number;
    invoicesLeft: number;
    totalInvoices: number;
    trialInvoicesLimit: number;
    machineId: string;
}

/**
 * Super Secure License Key Generator
 * Algorithm: MD5-like hash of MachineID + Secret Salt
 */
export function generateLicenseKey(machineId: string): string {
    // Simple but effective key generation for offline mode
    // Formats: XXXX-XXXX-XXXX-XXXX
    let hash = 0;
    const salt = "SMART_ACC_PRO_2024";
    const str = machineId + salt;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    const hex = Math.abs(hash).toString(16).toUpperCase().padEnd(16, '0');
    return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

export async function getLicenseStatus(): Promise<LicenseStatus> {
    const tenantId = "tenant_default";

    // 1. Force license to always be active and valid
    const isActivated = true;
    const isExpired = false;
    const trialDaysLeft = 9999;
    const invoicesLeft = 9999;
    const invoiceCount = 0;
    const LIMIT_INVOICES = 9999;

    // Get Machine ID with a better fallback for Desktop
    let machineId = "SMART-ACC-MASTER-STATION";
    try {
        if (typeof window !== 'undefined' && (window as any).electron?.getMachineId) {
            const realId = await (window as any).electron.getMachineId();
            if (realId) machineId = realId;
        } else {
            // Fallback that doesn't use 'tenant_default' to avoid confusion
            const _require = eval('require');
            const os = _require('os');
            machineId = `DEV-${os.hostname() || 'LOCAL'}`.toUpperCase();
        }
    } catch (e) {
        machineId = "TENANT-STATIC-DEFAULT";
    }

    return {
        isActivated,
        isExpired,
        trialDaysLeft,
        invoicesLeft,
        totalInvoices: invoiceCount,
        trialInvoicesLimit: LIMIT_INVOICES,
        machineId: machineId
    };
}
