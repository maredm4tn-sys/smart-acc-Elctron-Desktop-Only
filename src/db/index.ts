import * as schema from './schema.sqlite';

// --- DB CONNECTION STATE ---
let _cachedDb: any = null;
let _sqliteInstance: any = null; // Store raw instance for closing
let _currentDbPath: string | null = null;
let _isRestoring: boolean = false; // LOCKOUT FLAG
// ---------------------------

export function setRestoringFlag(val: boolean) {
    _isRestoring = val;
    if (val) {
        resetDbConnection(); // Close it first while we still have the reference
    }
}

/**
 * Centrally resolve the database file path.
 */
export function getDatabasePath() {
    if (typeof window !== 'undefined') return '';
    const _require = eval('require');
    const path = _require('path');
    const fs = _require('fs');

    // Base AppData path for local storage
    const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.local', 'share'));
    const defaultAppPath = path.join(appData, 'smart-acc-electron-desktop-only');

    if (!fs.existsSync(defaultAppPath)) {
        fs.mkdirSync(defaultAppPath, { recursive: true });
    }

    let targetDir = defaultAppPath;
    const configPath = path.join(defaultAppPath, 'storage_config.json');

    try {
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            if (config.storagePath) {
                let potentialPath = config.storagePath;
                if (fs.existsSync(potentialPath) && fs.lstatSync(potentialPath).isFile()) {
                    potentialPath = path.dirname(potentialPath);
                }
                if (fs.existsSync(potentialPath)) {
                    targetDir = potentialPath;
                }
            }
        }
    } catch (e) { }

    return path.join(targetDir, 'smart_acc_v6.db');
}

function resolveDbPath() {
    return getDatabasePath();
}

/**
 * 🛠️ [STRICT DB INITIALIZATION]
 * No more "Mocks". If it fails, it fails with a clear log.
 */
function createDatabaseInstance() {
    if (typeof window !== 'undefined') return { query: {}, select: () => ({}), execute: () => { } } as any;

    const _require = eval('require');
    const path = _require('path');
    const fs = _require('fs');
    let BetterSqlite;

    logToDesktop("🏗️ [DB-INIT] Starting real database connection...");

    if (_isRestoring) {
        logToDesktop("🚫 [DB-INIT] Connection blocked: Restoration in progress.", 'error');
        throw new Error("Database is currently locked for restoration.");
    }

    try {
        // 1. Try standard require first
        try {
            BetterSqlite = _require('better-sqlite3');
            logToDesktop("✅ [DB-INIT] better-sqlite3 loaded via standard require.");
        } catch (e: any) {
            logToDesktop(`⚠️ [DB-INIT] Standard load failed: ${e.message}. Trying sidecar paths...`, 'error');

            // 2. Try common Electron build paths
            const execPath = path.dirname(process.execPath);
            const possiblePaths = [
                path.join(execPath, 'resources', 'app', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
                path.join(execPath, 'resources', 'app.asar.unpacked', 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node'),
                path.join(process.cwd(), 'node_modules', 'better-sqlite3', 'build', 'Release', 'better_sqlite3.node')
            ];

            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    logToDesktop(`📂 [DB-INIT] Manual Load from: ${p}`);
                    const bindings = _require(p);
                    BetterSqlite = _require('better-sqlite3/lib/database')(bindings);
                    break;
                }
            }
        }

        if (!BetterSqlite) throw new Error("Could not find better-sqlite3 binary.");

        const { drizzle: betterSqliteDrizzle } = _require('drizzle-orm/better-sqlite3');
        const dbPath = resolveDbPath();

        logToDesktop(`📂 [DB-INIT] Database Target: ${dbPath}`);
        _sqliteInstance = new BetterSqlite(dbPath);
        _sqliteInstance.pragma('journal_mode = WAL');

        // Ensure tables exist synchronously
        ensureTablesExist(_sqliteInstance);

        return betterSqliteDrizzle(_sqliteInstance, { schema });

    } catch (err: any) {
        logToDesktop(`🛑 [DB-FATAL] FATAL ERROR: ${err.message}`, 'error');
        throw err;
    }
}

function ensureTablesExist(sqlite: any) {
    try {
        const _require = eval('require');
        logToDesktop("🔄 [DB-SYNC] Verifying Tables...");
        const { getTableConfig } = _require('drizzle-orm/sqlite-core');
        const { getTableColumns } = _require('drizzle-orm');
        const bcrypt = _require('bcryptjs');

        sqlite.exec("PRAGMA foreign_keys = OFF;");

        const tables = [
            schema.tenants, schema.users, schema.fiscalYears, schema.accounts,
            schema.journalEntries, schema.journalLines, schema.categories,
            schema.units, schema.products, schema.suppliers, schema.customers,
            schema.representatives, schema.installments, schema.invoices,
            schema.invoiceItems, schema.purchaseInvoices, schema.purchaseInvoiceItems,
            schema.vouchers, schema.auditLogs, schema.employees, schema.advances,
            schema.payrolls, schema.attendance, schema.licensing, schema.shifts,
            schema.partners, schema.partnerTransactions, schema.warehouses, schema.stockLevels
        ];

        for (const table of tables) {
            const config = getTableConfig(table as any);
            const columns = getTableColumns(table as any);
            const tableName = config.name;

            const columnDefs: string[] = [];
            for (const [_, col] of Object.entries(columns)) {
                const colName = (col as any).name;
                let colType = 'TEXT';
                try {
                    colType = (col as any).getSQLType().toUpperCase();
                } catch (e) {
                    colType = 'TEXT';
                }

                const isId = colName.toLowerCase() === 'id';
                const isUuidId = tableName === 'tenants' || tableName === 'app_users' || tableName === 'users' || tableName === 'audit_logs';

                let definition = `"${colName}" ${isId && !isUuidId ? 'INTEGER' : colType}`;
                if (isId) {
                    definition += isUuidId ? " PRIMARY KEY" : " PRIMARY KEY AUTOINCREMENT";
                } else if ((col as any).notNull) {
                    definition += " NOT NULL";
                }
                columnDefs.push(definition);
            }

            sqlite.exec(`CREATE TABLE IF NOT EXISTS "${tableName}" (${columnDefs.join(', ')})`);

            // Column synchronization
            const existingColumns = sqlite.prepare(`PRAGMA table_info("${tableName}")`).all();
            const existingColNames = existingColumns.map((c: any) => c.name);

            for (const [_, col] of Object.entries(columns)) {
                const colName = (col as any).name;
                if (!existingColNames.includes(colName)) {
                    let colType = 'TEXT';
                    try { colType = (col as any).getSQLType().toUpperCase(); } catch (e) { }
                    let defaultValue = "";
                    if ((col as any).defaultValue !== undefined) {
                        if (typeof (col as any).defaultValue === 'string') defaultValue = ` DEFAULT '${(col as any).defaultValue}'`;
                        else if (typeof (col as any).defaultValue === 'number') defaultValue = ` DEFAULT ${(col as any).defaultValue}`;
                        else if (typeof (col as any).defaultValue === 'boolean') defaultValue = ` DEFAULT ${(col as any).defaultValue ? 1 : 0}`;
                    }
                    try {
                        sqlite.exec(`ALTER TABLE "${tableName}" ADD COLUMN "${colName}" ${colType}${defaultValue}`);
                    } catch (err: any) { }
                }
            }
        }

        // --- DATA MIGRATION LAYER (Compatibility with old DBs) ---
        logToDesktop("🔍 [DB-MIGRATE] Checking for legacy data structures...");
        try {
            // 1. Products: code -> sku
            const existingProdCols = sqlite.prepare("PRAGMA table_info('products')").all();
            const hasCode = existingProdCols.some((c: any) => c.name === 'code');
            if (hasCode) {
                logToDesktop("📦 [DB-MIGRATE] Migrating Products: code -> sku");
                sqlite.exec(`
                    UPDATE products SET sku = code WHERE (sku IS NULL OR sku = '') AND (code IS NOT NULL AND code != '');
                `);
            }

            // 2. Customers: debit/credit -> openingBalance
            const existingCustCols = sqlite.prepare("PRAGMA table_info('customers')").all();
            const hasDebit = existingCustCols.some((c: any) => c.name === 'debit' || c.name === 'credit');
            if (hasDebit) {
                logToDesktop("👤 [DB-MIGRATE] Migrating Customers: debit/credit -> opening_balance");
                // Note: opening_balance might not exist yet if it's a very old DB, 
                // but the ensureTablesExist added it above via ALTER TABLE.
                try {
                    sqlite.exec(`
                        UPDATE customers 
                        SET opening_balance = CAST((COALESCE(debit, 0) - COALESCE(credit, 0)) AS REAL) 
                        WHERE (opening_balance IS NULL OR opening_balance = 0);
                    `);
                } catch (e: any) {
                    logToDesktop(`⚠️ [DB-MIGRATE] Customer migration note: ${e.message}`);
                }
            }
        } catch (migErr: any) {
            logToDesktop(`⚠️ [DB-MIGRATE] Migration error: ${migErr.message}`, 'error');
        }
        // ---------------------------------------------------------

        sqlite.exec("PRAGMA foreign_keys = ON;");

        // Essential Seeding
        const tenantId = 'tenant_default';
        sqlite.prepare("INSERT OR IGNORE INTO tenants (id, name) VALUES (?, ?)").run(tenantId, 'Main Branch');
        const hash = bcrypt.hashSync("admin", 10);
        sqlite.prepare("INSERT OR IGNORE INTO app_users (id, tenant_id, username, full_name, password_hash, role, status, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run('user_admin_v1', tenantId, 'admin', 'System Administrator', hash, 'admin', 'ACTIVE', 1);

    } catch (e: any) {
        logToDesktop(`🛑 [DB-SYNC] FAILED: ${e.message}`, 'error');
        throw e;
    }
}

export function resetDbConnection() {
    if (_sqliteInstance) {
        logToDesktop("🔌 [DB-CLOSE] Disabling WAL and closing connection...");
        try {
            _sqliteInstance.pragma('wal_checkpoint(TRUNCATE)');
            _sqliteInstance.pragma('journal_mode = DELETE');
            _sqliteInstance.close();
        } catch (e) {
            logToDesktop(`⚠️ [DB-CLOSE] Error during clean close: ${(e as any).message}`, 'error');
            try { _sqliteInstance.close(); } catch (inner) { }
        }
        _sqliteInstance = null;
    }
    _cachedDb = null;
    _currentDbPath = null;
}

export const db = new Proxy({} as any, {
    get: (_, prop) => {
        if (typeof window === 'undefined') {
            const targetDbPath = resolveDbPath();
            if (_cachedDb && _currentDbPath !== targetDbPath) {
                _cachedDb = null;
            }
            _currentDbPath = targetDbPath;
        }

        if (!_cachedDb) _cachedDb = createDatabaseInstance();

        const value = _cachedDb[prop];
        if (!value && typeof window !== 'undefined') return () => ({});
        return typeof value === 'function' ? value.bind(_cachedDb) : value;
    }
});

export async function withErrorHandling<T>(actionName: string, fn: () => Promise<T>): Promise<{ success: boolean; data?: T; message?: string }> {
    try {
        const result = await fn();
        return { success: true, data: result };
    } catch (e: any) {
        logToDesktop(`❌ [ACTION:${actionName}] Error: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
}

export function logToDesktop(message: string, level: 'info' | 'error' = 'info') {
    if (typeof window !== 'undefined') return;
    try {
        const _require = eval('require');
        const fs = _require('fs');
        const path = _require('path');
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.local', 'share'));
        const logPath = path.join(appData, 'smart-acc-electron-desktop-only', 'main_db.log');
        const timestamp = new Date().toISOString();
        fs.appendFileSync(logPath, `[${timestamp}] [${level.toUpperCase()}] ${message}\n`);
    } catch (e) { }
}
