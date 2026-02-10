
import { db } from "./src/db";
import { suppliers, products, customers, representatives, invoices, invoiceItems, vouchers, accounts } from "./src/db/schema.sqlite";
import { eq, desc } from "drizzle-orm";

const TENANT_ID = 'tenant_default';
const USER_ID = 'user_admin_v1';

async function simulate() {
    console.log("🚀 Starting Full Accounting Cycle Simulation...");

    try {
        // 1. Add Supplier
        console.log("📦 Step 1: Adding Supplier...");
        const [supplier] = await db.insert(suppliers).values({
            tenantId: TENANT_ID,
            name: "شركة النجم للتوريدات",
            companyName: "النجم جروب",
            phone: "01000000000",
            openingBalance: 0
        }).returning();
        console.log("✅ Supplier Added:", supplier.name);

        // 2. Add Product
        console.log("🖥️ Step 2: Adding Product...");
        const [product] = await db.insert(products).values({
            tenantId: TENANT_ID,
            name: "شاشة سامسونج 32",
            sku: "SAM-32-001",
            type: "goods",
            buyPrice: "3000",
            sellPrice: "4000",
            stockQuantity: "50", // Initial stock for testing
            minStock: 5
        }).returning();
        console.log("✅ Product Added:", product.name);

        // 3. Add Representative
        console.log("👤 Step 3: Adding Representative...");
        const [rep] = await db.insert(representatives).values({
            tenantId: TENANT_ID,
            name: "أحمد مندوب",
            phone: "01111111111",
            type: "sales",
            isActive: true
        }).returning();
        console.log("✅ Representative Added:", rep.name);

        // 4. Add Customer
        console.log("🤝 Step 4: Adding Customer...");
        const [customer] = await db.insert(customers).values({
            tenantId: TENANT_ID,
            name: "معرض الأمل",
            representativeId: rep.id,
            priceLevel: "retail",
            openingBalance: 0
        }).returning();
        console.log("✅ Customer Added:", customer.name);

        // 5. Create Sales Invoice (5 items)
        console.log("📄 Step 5: Creating Sales Invoice...");
        const subtotal = 5 * 4000;
        const [invoice] = await db.insert(invoices).values({
            tenantId: TENANT_ID,
            invoiceNumber: `INV-TEST-${Date.now().toString().slice(-4)}`,
            customerId: customer.id,
            customerName: customer.name,
            representativeId: rep.id,
            issueDate: new Date().toISOString().split('T')[0],
            subtotal: subtotal.toString(),
            totalAmount: subtotal.toString(),
            amountPaid: "0.00",
            paymentStatus: "unpaid",
            status: "issued",
            createdBy: USER_ID
        }).returning();

        await db.insert(invoiceItems).values({
            invoiceId: invoice.id,
            productId: product.id,
            description: product.name,
            quantity: "5",
            unitPrice: "4000",
            total: subtotal.toString()
        });

        // Update Stock
        await db.update(products).set({ stockQuantity: "45" }).where(eq(products.id, product.id));
        console.log("✅ Invoice Created & Stock Updated to 45");

        // 6. Record Payment (Receipt)
        console.log("💰 Step 6: Recording Receipt Voucher...");
        await db.insert(vouchers).values({
            tenantId: TENANT_ID,
            voucherNumber: `RV-TEST-${Date.now().toString().slice(-4)}`,
            type: "receipt",
            date: new Date().toISOString().split('T')[0],
            amount: "10000",
            partyType: "customer",
            partyId: customer.id,
            description: "تحصيل تحت الحساب - سيدي المحاسب",
            status: "posted",
            createdBy: USER_ID
        });

        // Update Invoice status
        await db.update(invoices).set({
            amountPaid: "10000",
            paymentStatus: "partial"
        }).where(eq(invoices.id, invoice.id));

        console.log("✅ 10,000 EGP Collected and Invoice Updated to Partial");

        console.log("\n✨ FULL ACCOUNTING CYCLE SIMULATED SUCCESSFULLY! ✨");
        process.exit(0);

    } catch (error) {
        console.error("❌ Simulation Failed:", error);
        process.exit(1);
    }
}

simulate();
