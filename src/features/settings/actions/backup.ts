
'use server';

import { db } from "@/db";
import { sql } from "drizzle-orm";
import fs from 'fs';
import path from 'path';

export async function createFullBackup(specificPath?: string | null) {
    try {
        let destinationPath = specificPath;

        if (!destinationPath) {
            const backupDir = path.join(process.cwd(), 'public', 'backups');
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
            destinationPath = path.join(backupDir, fileName);
        }

        // SQLite VACUUM INTO is the safe way to backup while app is running
        // Ensure path uses forward slashes for SQLite command
        // Note: SQLite VACUUM INTO requires the destination file to NOT exist
        if (fs.existsSync(destinationPath)) {
            fs.unlinkSync(destinationPath);
        }

        const normalizedPath = destinationPath.replace(/\\/g, '/');
        await db.run(sql`VACUUM INTO ${sql.raw(`'${normalizedPath}'`)}`);

        // Check file size for debugging
        const stats = fs.statSync(destinationPath);
        const sizeKB = Math.round(stats.size / 1024);

        // Return info
        return {
            success: true,
            downloadUrl: specificPath ? null : `/backups/${path.basename(destinationPath)}`,
            savedPath: destinationPath,
            sizeKB
        };
    } catch (error: any) {
        console.error("[Backup] Failed:", error);
        return { success: false, error: error.message };
    }
}
