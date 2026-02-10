
import Database from '@tauri-apps/plugin-sql';
import bcrypt from "bcryptjs";
import * as schema from './schema.sqlite';
import { getTableConfig, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { getTableColumns } from 'drizzle-orm';

/**
 * AUTOMATED SCHEMA SYNC (UNIVERSAL HUB)
 * Source of truth: schema.sqlite.ts
 */
export async function initSchema(db: Database) {
    try {
        console.log("🏗️ [INIT] Dynamic Schema Sync Starting...");

        // 1. Get all tables from schema
        const tableEntries = Object.entries(schema).filter(([_, val]) => {
            return val && typeof val === 'object' && (val instanceof SQLiteTable || (val as any).constructor?.name === 'SQLiteTable' || (val as any)._?.table);
        });

        console.log(`📡 [Sync] Found ${tableEntries.length} tables in schema.`);

        for (const [_, tableObj] of tableEntries) {
            try {
                const config = getTableConfig(tableObj as any);
                const columns = getTableColumns(tableObj as any);
                const tableName = config.name;

                const columnDefs: string[] = [];
                for (const [_, col] of Object.entries(columns)) {
                    const colName = (col as any).name;
                    let colType = (col as any).getSQLType();

                    if (colType.includes('serial')) colType = 'INTEGER';

                    let definition = `${colName} ${colType}`;
                    if (!(col as any).notNull) definition += " NULL";
                    else definition += " NOT NULL";

                    if ((col as any).isAutoincrement) {
                        definition += " PRIMARY KEY AUTOINCREMENT";
                    } else if ((col as any).primary) {
                        // Check if it's the only primary key to avoid double PRIMARY KEY errors
                        // For simplicity in SQLite, we often rely on CREATE TABLE IF NOT EXISTS
                        // and let Drizzle handle complex keys. But we need at least one for seeding.
                    }

                    columnDefs.push(definition);
                }

                if (columnDefs.length > 0) {
                    const sqlTable = `CREATE TABLE IF NOT EXISTS ${tableName} (\n                ${columnDefs.join(',\n                ')}\n            )`;
                    await db.execute(sqlTable);
                }
            } catch (tableErr) {
                console.warn(`⚠️ [Sync] Failed to sync table ${(tableObj as any)?._?.name || 'unknown'}:`, tableErr);
            }
        }

        // 2. Post-Sync Security & Defaults
        const hash = await bcrypt.hash("admin", 10);

        // Ensure default tenant exists
        await db.execute("INSERT OR IGNORE INTO tenants (id, name) VALUES ('tenant_default', 'Main Headquarters')");

        // Sync Admin - BE CAREFUL: use try-catch to avoid crashing if table creation failed
        try {
            const existingAdmin = await db.select("SELECT id FROM app_users WHERE username = 'admin' LIMIT 1") as any[];
            if (!existingAdmin || existingAdmin.length === 0) {
                console.log("🌱 [INIT] Seeding fresh admin user...");
                await db.execute(
                    "INSERT INTO app_users (id, tenant_id, username, full_name, password_hash, role, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    ['user_admin', 'tenant_default', 'admin', 'System Administrator', hash, 'admin', 'ACTIVE', 1]
                );
            } else {
                await db.execute("UPDATE app_users SET password_hash = ? WHERE username = 'admin'", [hash]);
            }
        } catch (seedErr) {
            console.error("⚠️ [INIT] Seeding failed (app_users might not exist):", seedErr);
        }

        console.log("✅ [INIT] Structural Sync Complete.");

    } catch (err) {
        console.error("❌ [INIT] Global Sync Error:", err);
        // We don't throw here to allow the app to at least try to render
    }
}
