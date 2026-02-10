"use server";

import { db, logToDesktop } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// 🛡️ NO-SCHEMA Version for maximum compatibility in Desktop
// We will take whatever fields come and update them directly if they exist in the DB columns

export async function updateSettings(inputData: any) {
    try {
        logToDesktop("--- [SETTINGS-ACTION] Raw Update Started ---");

        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        const tenantId = session?.tenantId || inputData.tenantId || inputData.id || 'tenant_default';

        logToDesktop(`[TARGET] Tenant: ${tenantId}`);

        // Extract only known fields to avoid DB errors
        const updateFields: any = {};

        // Facility Info
        if (inputData.name !== undefined) updateFields.name = inputData.name;
        if (inputData.phone !== undefined) updateFields.phone = inputData.phone;
        if (inputData.address !== undefined) updateFields.address = inputData.address;
        if (inputData.taxId !== undefined) updateFields.taxId = inputData.taxId;
        if (inputData.currency !== undefined) updateFields.currency = inputData.currency;
        if (inputData.logoUrl !== undefined) updateFields.logoUrl = inputData.logoUrl;

        // Tax Settings
        if (inputData.taxEnabled !== undefined) updateFields.taxEnabled = Boolean(inputData.taxEnabled);
        if (inputData.taxName !== undefined) updateFields.taxName = inputData.taxName;
        if (inputData.taxNameEn !== undefined) updateFields.taxNameEn = inputData.taxNameEn;
        if (inputData.taxRate !== undefined) updateFields.taxRate = Number(inputData.taxRate || 0);
        if (inputData.taxType !== undefined) updateFields.taxType = inputData.taxType;

        // Invoice/Print Settings
        if (inputData.invoicePrefix !== undefined) updateFields.invoicePrefix = inputData.invoicePrefix;
        if (inputData.nextInvoiceNumber !== undefined) updateFields.nextInvoiceNumber = Number(inputData.nextInvoiceNumber || 1);
        if (inputData.invoiceFooterNotes !== undefined) updateFields.invoiceFooterNotes = inputData.invoiceFooterNotes;
        if (inputData.defaultPrintSales !== undefined) updateFields.defaultPrintSales = inputData.defaultPrintSales;
        if (inputData.defaultPrintPOS !== undefined) updateFields.defaultPrintPOS = inputData.defaultPrintPOS;
        if (inputData.storagePath !== undefined) updateFields.storagePath = inputData.storagePath;

        // Auto-Backup Settings
        if (inputData.autoBackupEnabled !== undefined) updateFields.autoBackupEnabled = Boolean(inputData.autoBackupEnabled);
        if (inputData.autoBackupTime !== undefined) updateFields.autoBackupTime = inputData.autoBackupTime;
        if (inputData.autoBackupTimes !== undefined) updateFields.autoBackupTimes = inputData.autoBackupTimes;
        if (inputData.autoBackupPath !== undefined) updateFields.autoBackupPath = inputData.autoBackupPath;

        // Email Backup Settings
        if (inputData.smtpHost !== undefined) updateFields.smtpHost = inputData.smtpHost;
        if (inputData.smtpPort !== undefined) updateFields.smtpPort = Number(inputData.smtpPort || 587);
        if (inputData.smtpUser !== undefined) updateFields.smtpUser = inputData.smtpUser;
        if (inputData.smtpPass !== undefined) updateFields.smtpPass = inputData.smtpPass;
        if (inputData.backupRecipientEmail !== undefined) updateFields.backupRecipientEmail = inputData.backupRecipientEmail;
        if (inputData.emailBackupEnabled !== undefined) updateFields.emailBackupEnabled = Boolean(inputData.emailBackupEnabled);

        // Telegram Backup Settings
        if (inputData.telegramBotToken !== undefined) updateFields.telegramBotToken = inputData.telegramBotToken;
        if (inputData.telegramChatId !== undefined) updateFields.telegramChatId = inputData.telegramChatId;
        if (inputData.telegramBackupEnabled !== undefined) updateFields.telegramBackupEnabled = Boolean(inputData.telegramBackupEnabled);

        // UI Settings
        if (inputData.numeralSystem !== undefined) updateFields.numeralSystem = inputData.numeralSystem;
        if (inputData.zoomLevel !== undefined) updateFields.zoomLevel = Number(inputData.zoomLevel || 1.0);

        updateFields.updatedAt = new Date();

        // EXECUTE UPDATE with UPSERT fallback
        const result = await db.update(tenants)
            .set(updateFields)
            .where(eq(tenants.id, tenantId))
            .run();

        if (result.changes === 0) {
            logToDesktop(`[UPSERT] No record found for ${tenantId}, creating new.`);
            await db.insert(tenants).values({
                id: tenantId,
                name: "Smart Acc",
                currency: "EGP",
                ...updateFields
            }).onConflictDoUpdate({
                target: tenants.id,
                set: updateFields
            }).run();
        }

        revalidatePath("/dashboard/settings");
        revalidatePath("/dashboard/sales/create");
        revalidatePath("/dashboard/pos");

        logToDesktop(`--- [SETTINGS-ACTION] SUCCESS for ${tenantId} ---`);
        return { success: true, message: "Settings updated successfully" };

    } catch (error: any) {
        logToDesktop(`[CRITICAL-ERROR] ${error.message}`);
        console.error("UpdateSettings Failure:", error);
        return { success: false, message: "Server Error: " + error.message };
    }
}

export async function getSettings() {
    try {
        const { getSession } = await import("@/features/auth/actions");
        const session = await getSession();
        const tenantId = session?.tenantId || 'tenant_default';

        const rows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        const { getDatabasePath } = await import("@/db");
        const activePath = getDatabasePath();

        if (rows.length === 0) {
            const defaultData = { id: tenantId, name: 'Smart Acc', currency: 'EGP', activeDbPath: activePath };
            await db.insert(tenants).values({ id: tenantId, name: 'Smart Acc', currency: 'EGP' }).run();
            return defaultData;
        }

        return { ...rows[0], activeDbPath: activePath };
    } catch (e: any) {
        const { getDatabasePath } = await import("@/db");
        return { name: "Smart Acc", currency: "EGP", activeDbPath: getDatabasePath() };
    }
}
