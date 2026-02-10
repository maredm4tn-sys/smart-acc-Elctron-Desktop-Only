const Database = require('better-sqlite3');
const path = require('path');

try {
    const dbPath = path.join(process.cwd(), 'smart_acc_v4.db');
    console.log('Opening database at:', dbPath);
    const db = new Database(dbPath);
    const accounts = db.prepare('SELECT id, name, type FROM accounts').all();
    console.table(accounts);
    db.close();
} catch (error) {
    console.error('Error:', error);
}
