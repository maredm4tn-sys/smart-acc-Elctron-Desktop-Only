import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { getSession } from "@/features/auth/actions";
import * as XLSX from "xlsx";


/**
 * 🛠️ [DEBUG LOGGER]
 */
function logToDesktop(message: string, level: 'info' | 'error' = 'info') {
    if (typeof window !== 'undefined') return;
    try {
        const _require = eval('require');
        const fs = _require('fs');
        const path = _require('path');
        const appData = process.env.APPDATA || (process.platform === 'darwin' ? path.join(process.env.HOME || '', 'Library', 'Application Support') : path.join(process.env.HOME || '', '.local', 'share'));
        const logPath = path.join(appData, 'smart-acc-electron-desktop-only', 'import_debug.log');

        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (e) { }
}

export async function POST(request: NextRequest) {
    try {
        logToDesktop("🚀 [IMPORT_START] Request received.");

        const session = await getSession();
        // Fallback for production if session is missing standard cookies but we are internal
        const tenantId = session?.tenantId || 'tenant_default';
        const role = session?.role || 'admin';

        logToDesktop(`👤 [AUTH] Tenant: ${tenantId}, Role: ${role}`);

        if (!tenantId) {
            logToDesktop("❌ [AUTH_FAIL] No tenant ID.");
            return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
        }

        logToDesktop("📂 [FORMDATA] Reading form data...");
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            logToDesktop("❌ [FILE_MISSING] No file in request.");
            return NextResponse.json({ success: false, message: "No file provided" }, { status: 400 });
        }

        logToDesktop(`📄 [FILE_INFO] Name: ${file.name}, Size: ${file.size}`);

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        logToDesktop("📊 [XLSX] Parsing buffer...");
        const workbook = XLSX.read(buffer, { type: "buffer" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);

        logToDesktop(`✅ [XLSX_SUCCESS] Parsed ${jsonData.length} rows.`);

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData as any[]) {
            // Flexible keys: Handle Arabic or English headers
            const name = row["Name"] || row["الاسم"] || row["name"];
            if (!name) continue; // Skip if no name

            const companyName = row["Company"] || row["الشركة"] || row["Company Name"] || row["companyName"];
            const phone = row["Phone"] || row["الهاتف"] || row["phone"]?.toString();
            const email = row["Email"] || row["البريد"] || row["email"];
            const address = row["Address"] || row["العنوان"] || row["address"];
            const taxId = row["Tax ID"] || row["الرقم الضريبي"] || row["taxId"]?.toString();

            try {
                // Ensure email is valid or null if empty string
                const validEmail = (email && email.includes("@")) ? email : null;

                await db.insert(customers).values({
                    tenantId,
                    name: String(name),
                    companyName: companyName ? String(companyName) : null,
                    phone: phone ? String(phone) : null,
                    email: validEmail,
                    address: address ? String(address) : null,
                    taxId: taxId ? String(taxId) : null,
                });
                successCount++;
            } catch (err: any) {
                logToDesktop(`⚠️ [ROW_ERROR] ${err.message}`, 'error');
                errorCount++;
            }
        }

        logToDesktop(`🏁 [DONE] Success: ${successCount}, Errors: ${errorCount}`);

        return NextResponse.json({
            success: true,
            message: `Imported ${successCount} customers.`
        });

    } catch (error: any) {
        logToDesktop(`🔥 [FATAL_ERROR] ${error.message} \nStack: ${error.stack}`, 'error');
        console.error("Import Error:", error);
        return NextResponse.json({ success: false, message: "Server Error: " + error.message }, { status: 500 });
    }
}
