import { db } from "@/db";
import { shifts, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDictionary } from "@/lib/i18n-server";
import { ShiftReceipt } from "@/features/shifts/components/shift-receipt";
import { getShiftSummary } from "@/features/shifts/actions";

export default async function PrintShiftReceipt({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const shiftData = await db.query.shifts.findFirst({
        where: eq(shifts.id, Number(id)),
        with: {
            user: true
        }
    });

    if (!shiftData) return <div className="p-10 text-center">Shift not found</div>;

    const summary = await getShiftSummary(Number(id));
    const dict = await getDictionary();

    const systemCash = Number(shiftData.startBalance || 0) + (summary?.netCashMovement || 0);
    const actual = Number(shiftData.endBalance || 0);
    const diff = actual - systemCash;

    const data = {
        shiftId: shiftData.id,
        shiftNumber: shiftData.shiftNumber,
        startTime: shiftData.startTime,
        endTime: shiftData.endTime || new Date(),
        cashierName: (shiftData as any).user?.name || "User",
        startBalance: Number(shiftData.startBalance || 0),
        endBalance: actual,
        expectedCash: systemCash,
        cashSales: summary.cashSales,
        visaSales: summary.visaSales,
        unpaidSales: summary.unpaidSales,
        expensesTotal: summary.payments,
        returnsTotal: 0, // Placeholder if needed
        difference: diff
    };

    return (
        <div className="bg-white min-h-screen flex items-start justify-center p-4">
            <ShiftReceipt data={data} />
            <script dangerouslySetInnerHTML={{ __html: 'window.print()' }} />
        </div>
    );
}
