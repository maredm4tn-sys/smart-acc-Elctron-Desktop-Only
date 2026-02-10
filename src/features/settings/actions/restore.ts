
'use server';

import { logToDesktop } from "@/db";
import fs from 'fs';
import path from 'path';

export async function restoreDatabase(sourcePath: string) {
    try {
        logToDesktop(`🔄 [RESTORE-ATOMIC] Preparing swap from: ${sourcePath}`);

        if (!fs.existsSync(sourcePath)) {
            throw new Error("Backup file not found.");
        }

        const stats = fs.statSync(sourcePath);
        if (stats.size === 0) {
            throw new Error("Backup file is empty.");
        }

        // Resolve paths dynamically
        const { getDatabasePath } = await import("@/db");
        const dbPath = getDatabasePath();
        const pendingDbPath = dbPath + '.pending';

        logToDesktop(`📂 [RESTORE-ATOMIC] Target Pending Path: ${pendingDbPath}`);

        // 1. Copy the backup to the .pending file
        // We can always write a new .pending file because no one is using it!
        try {
            if (fs.existsSync(pendingDbPath)) {
                fs.unlinkSync(pendingDbPath);
            }
            fs.copyFileSync(sourcePath, pendingDbPath);
            logToDesktop(`✅ [RESTORE-ATOMIC] Backup copied to .pending successfully.`);
        } catch (e: any) {
            logToDesktop(`❌ [RESTORE-ATOMIC] Failed to create pending file: ${e.message}`, 'error');
            throw new Error(`Failed to prepare restore file: ${e.message}`);
        }

        // 2. Return success. The UI will now trigger a relaunch.
        // The electron/main.js will see the .pending file and swap it.
        return { success: true };

    } catch (error: any) {
        logToDesktop(`🛑 [RESTORE-ATOMIC] Failed: ${error.message}`, 'error');
        return { success: false, error: error.message };
    }
}
