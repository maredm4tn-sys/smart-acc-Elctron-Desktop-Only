
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME, 'Library', 'Application Support') : path.join(process.env.HOME, '.local', 'share'));
const dbPath = path.join(appData, 'smart-acc-electron-desktop-only', 'smart_acc_v4.db');

console.log("Connecting to DB at:", dbPath);

if (!fs.existsSync(dbPath)) {
    console.error("❌ DB File not found. Make sure the app has run at least once.");
    process.exit(1);
}

const db = new Database(dbPath);
const TENANT_ID = 'tenant_default';
const USER_ID = 'user_admin_v1';

try {
    db.prepare('BEGIN').run();

    console.log("🚀 Starting simulation...");

    // 1. Supplier
    const supStmt = db.prepare('INSERT INTO suppliers (tenant_id, name, company_name, phone, opening_balance) VALUES (?, ?, ?, ?, ?)');
    const supInfo = supStmt.run(TENANT_ID, 'شركة النجم للتوريدات (سيميوليشن)', 'النجم جروب', '01012345678', 0);
    const supplierId = supInfo.lastInsertRowid;
    console.log("✅ Supplier Added ID:", supplierId);

    // 2. Product
    const prodStmt = db.prepare('INSERT INTO products (tenant_id, name, sku, type, buy_price, sell_price, stock_quantity, min_stock) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
    const prodInfo = prodStmt.run(TENANT_ID, 'شاشة سامسونج 32 (سيميوليشن)', 'SIM-SAM-32', 'goods', '3000', '4000', '50', 5);
    const productId = prodInfo.lastInsertRowid;
    console.log("✅ Product Added ID:", productId);

    // 3. Representative
    const repStmt = db.prepare('INSERT INTO representatives (tenant_id, name, phone, type, is_active) VALUES (?, ?, ?, ?, ?)');
    const repInfo = repStmt.run(TENANT_ID, 'أحمد مندوب (سيميوليشن)', '01122334455', 'sales', 1);
    const repId = repInfo.lastInsertRowid;
    console.log("✅ Representative Added ID:", repId);

    // 4. Customer
    const custStmt = db.prepare('INSERT INTO customers (tenant_id, name, representative_id, price_level, opening_balance) VALUES (?, ?, ?, ?, ?)');
    const custInfo = custStmt.run(TENANT_ID, 'معرض الأمل (سيميوليشن)', repId, 'retail', 0);
    const customerId = custInfo.lastInsertRowid;
    console.log("✅ Customer Added ID:", customerId);

    // 5. Invoice
    const invNum = `INV-SIM-${Date.now().toString().slice(-4)}`;
    const subtotal = 5 * 4000;
    const invStmt = db.prepare('INSERT INTO invoices (tenant_id, invoice_number, customer_id, customer_name, representative_id, issue_date, subtotal, total_amount, amount_paid, payment_status, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const invInfo = invStmt.run(TENANT_ID, invNum, customerId, 'معرض الأمل (سيميوليشن)', repId, new Date().toISOString().split('T')[0], subtotal.toString(), subtotal.toString(), '0.00', 'unpaid', 'issued', USER_ID);
    const invoiceId = invInfo.lastInsertRowid;
    console.log("✅ Invoice Created ID:", invoiceId);

    // 6. Invoice Items
    const itemStmt = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, description, quantity, unit_price, total) VALUES (?, ?, ?, ?, ?, ?)');
    itemStmt.run(invoiceId, productId, 'شاشة سامسونج 32 (سيميوليشن)', '5', '4000', subtotal.toString());
    console.log("✅ Invoice Items Linked");

    // 7. Update Stock
    db.prepare('UPDATE products SET stock_quantity = "45" WHERE id = ?').run(productId);
    console.log("✅ Stock Updated to 45");

    // 8. Voucher (Receipt)
    const vNum = `RV-SIM-${Date.now().toString().slice(-4)}`;
    const vStmt = db.prepare('INSERT INTO vouchers (tenant_id, voucher_number, type, date, amount, party_type, party_id, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    vStmt.run(TENANT_ID, vNum, 'receipt', new Date().toISOString().split('T')[0], '10000', 'customer', customerId, 'دفعة تحت الحساب - محاكاة', 'posted', USER_ID);
    console.log("✅ Receipt Voucher 10,000 Created");

    // 9. Update Invoice Paid Amount
    db.prepare('UPDATE invoices SET amount_paid = "10000", payment_status = "partial" WHERE id = ?').run(invoiceId);
    console.log("✅ Invoice Marked as Partial Paid");

    db.prepare('COMMIT').run();
    console.log("\n🎊 FULL ACCOUNTING CYCLE SIMULATED SUCCESSFULLY! 🎊");

} catch (e) {
    db.prepare('ROLLBACK').run();
    console.error("❌ Simulation Failed:", e.message);
} finally {
    db.close();
}
