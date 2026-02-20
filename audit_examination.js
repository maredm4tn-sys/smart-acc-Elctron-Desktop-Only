const Database = require('better-sqlite3');
const path = require('path');

// The project provides a specific binary for Node 20
const nativeBinding = path.join(__dirname, 'better_sqlite3_node20.node');
const dbPath = path.join(process.env.APPDATA, 'smart-acc-electron-desktop-only', 'smart_acc_v6.db');
const db = new Database(dbPath, { nativeBinding });

console.log('--- System Audit Report ---');
console.log('Database Path:', dbPath);

const tables = [
    'suppliers',
    'customers',
    'products',
    'employees',
    'representatives',
    'accounts',
    'journal_entries',
    'journal_lines'
];

tables.forEach(table => {
    try {
        const count = db.prepare(`SELECT count(*) as c FROM ${table}`).get().c;
        console.log(`${table}: ${count}`);
    } catch (e) {
        console.log(`${table}: Table not found or error - ${e.message}`);
    }
});

// Check stock value
try {
    const stockValue = db.prepare('SELECT SUM(purchasePrice * currentStock) as total FROM products').get().total;
    console.log('Estimated Stock Value:', stockValue);
} catch (e) {
    console.log('Stock Value Audit Error:', e.message);
}

// Check if opening journal exists
try {
    const openingStockJournal = db.prepare("SELECT count(*) as c FROM journal_entries WHERE description LIKE '%افتتاح%' OR description LIKE '%Opening%'").get().c;
    console.log('Opening Stock Journals found:', openingStockJournal);
} catch (e) {
    console.log('Journal Audit Error:', e.message);
}

db.close();
