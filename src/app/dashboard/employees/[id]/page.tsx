
import { getEmployeeById } from "@/features/employees/actions";
import { getDictionary } from "@/lib/i18n-server";
import EmployeeDetailsClient from "@/app/dashboard/employees/[id]/employee-details-client";
import { notFound } from "next/navigation";
import { getSettings } from "@/features/settings/actions";

export default async function EmployeeDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const dict = await getDictionary() as any;
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";

    const employee = await getEmployeeById(Number(id));

    if (!employee) {
        notFound();
    }

    return (
        <div className="p-6">
            <EmployeeDetailsClient employee={employee} dict={dict} currency={currency} />
        </div>
    );
}
