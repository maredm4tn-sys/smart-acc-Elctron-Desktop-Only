/**
 * Electron Database Bridge
 * This utility provides a clean interface for interacting with the SQLite database
 * via Electron IPC, bypassing the Next.js server for data operations in desktop mode.
 */

export interface DBResult {
    success: boolean;
    result?: any;
    rows?: any[];
    error?: string;
}

export const electronDb = {
    /**
     * Executes a non-query SQL statement (INSERT, UPDATE, DELETE)
     */
    async execute(sql: string, params: any[] = []): Promise<DBResult> {
        if (typeof window !== 'undefined' && (window as any).electron?.dbExecute) {
            return await (window as any).electron.dbExecute(sql, params);
        }
        throw new Error("Electron IPC not available");
    },

    /**
     * Executes a query SQL statement (SELECT)
     */
    async query(sql: string, params: any[] = []): Promise<DBResult> {
        if (typeof window !== 'undefined' && (window as any).electron?.dbQuery) {
            return await (window as any).electron.dbQuery(sql, params);
        }
        throw new Error("Electron IPC not available");
    },

    /**
     * Imports excel data via Electron IPC
     */
    async importExcel(type: 'customers' | 'products'): Promise<{ success: boolean; message: string; error?: string }> {
        if (typeof window !== 'undefined' && (window as any).electron?.importExcel) {
            return await (window as any).electron.importExcel(type);
        }
        throw new Error("Electron IPC not available");
    }
};

export const isDesktop = () => typeof window !== 'undefined' && !!(window as any).electron;
