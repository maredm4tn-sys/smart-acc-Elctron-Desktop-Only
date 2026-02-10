"use server";

import { db } from "@/db";
import { invoices } from "@/db/schema";
import { and, eq, sql, or } from "drizzle-orm";
import { requireSession } from "@/lib/tenant-security";

export async function getDailySummary() {
    try {
        let { tenantId } = await requireSession().catch(() => ({ tenantId: 'tenant_default' }));
        if (!tenantId) tenantId = 'tenant_default';

        // Get local date in YYYY-MM-DD format strictly
        const todayStr = new Date().toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD

        console.log("Fetching summary for date:", todayStr, "tenant:", tenantId);

        const stats = await db.select({
            totalSales: sql<number>`sum(CAST(${invoices.totalAmount} AS REAL))`,
            invoiceCount: sql<number>`count(${invoices.id})`,
            cash: sql<number>`sum(case when ${invoices.paymentMethod} = 'cash' then CAST(${invoices.totalAmount} AS REAL) else 0 end)`,
            card: sql<number>`sum(case when ${invoices.paymentMethod} = 'card' then CAST(${invoices.totalAmount} AS REAL) else 0 end)`,
            credit: sql<number>`sum(case when ${invoices.paymentMethod} = 'credit' then CAST(${invoices.totalAmount} AS REAL) else 0 end)`,
        })
            .from(invoices)
            .where(and(
                eq(invoices.tenantId, tenantId),
                // Use like or substr to be more resilient to timestamp strings
                or(
                    sql`date(${invoices.issueDate}) = ${todayStr}`,
                    sql`${invoices.issueDate} LIKE ${todayStr + '%'}`
                )
            ));

        const data = stats[0] || { totalSales: 0, invoiceCount: 0, cash: 0, card: 0, credit: 0 };

        return {
            success: true,
            data: {
                totalSales: Number(data.totalSales || 0),
                invoiceCount: Number(data.invoiceCount || 0),
                cash: Number(data.cash || 0),
                card: Number(data.card || 0),
                credit: Number(data.credit || 0),
            }
        };
    } catch (error: any) {
        console.error("Daily summary error:", error);
        return { success: false, message: error.message || "Failed to load summary" };
    }
}
