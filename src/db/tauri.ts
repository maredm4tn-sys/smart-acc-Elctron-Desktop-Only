import { drizzle } from 'drizzle-orm/sqlite-proxy';
import Database from '@tauri-apps/plugin-sql';
import * as schema from './schema';
import { initSchema } from './init';

let _db: any = null;

export const initTauriDb = async () => {
    if (_db) return _db;

    // Initialize the Tauri SQL plugin
    // Ensure you have added "sqlite:smart-acc-offline.db" to tauri.conf.json permissions
    const sqlite = await Database.load('sqlite:smart-acc-offline.db');

    // Auto-migrate on startup
    await initSchema(sqlite);

    _db = drizzle((async (sql, params, method) => {
        try {
            if (method === 'run') {
                const result = await sqlite.execute(sql, params);
                return {
                    rows: [],
                    insertId: result.lastInsertId,
                    rowsAffected: result.rowsAffected,
                };
            } else {
                const rows = await sqlite.select(sql, params);

                // Drizzle expects specific return parsing depending on structure
                // But generally proxy driver expects standard array of objects for 'all'
                if (method === 'all' || method === 'get') {
                    return { rows: rows };
                }

                if (method === 'values') {
                    const values = (rows as any[]).map((row: any) => Object.values(row));
                    return { rows: values };
                }

                return { rows: rows as any[] };
            }
        } catch (e) {
            console.error('Tauri SQL Error:', e);
            throw e;
        }
    }) as any, { schema });

    return _db;
};
