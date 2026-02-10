try {
    const BetterSqlite = require('better-sqlite3');
    console.log("✅ BetterSqlite loaded successfully. Version:", BetterSqlite.version);
    const db = new BetterSqlite(':memory:');
    console.log("✅ Database in memory created.");
} catch (e) {
    console.error("❌ BetterSqlite load FAILED:", e.message);
}
