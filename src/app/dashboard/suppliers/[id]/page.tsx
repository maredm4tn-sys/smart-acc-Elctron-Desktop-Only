
import { getDictionary } from "@/lib/i18n-server";
import { getSupplierStatement } from "@/features/suppliers/actions";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { format, isValid, parseISO } from "date-fns";
import { ar } from "date-fns/locale";
import { PrintButton } from "@/components/print-button";
import { getSettings } from "@/features/settings/actions";
import SupplierStatementClient from "./supplier-statement-client";

export default async function SupplierStatementPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: rawId } = await params;
    const id = parseInt(rawId);
    const settings = await getSettings();
    const currency = settings?.currency || "EGP";
    const dict = await getDictionary();

    if (isNaN(id)) {
        return <div className="p-8 text-center text-red-500">Invalid ID</div>;
    }

    const data = await getSupplierStatement(id);

    if (!data) {
        return (
            <div className="p-8 text-center space-y-4">
                <div className="text-red-500 font-bold text-xl">{dict.Common.Error}</div>
                <p className="text-muted-foreground">Could not load accounting data for supplier #{id}.</p>
                <Link href="/dashboard/suppliers">
                    <Button variant="outline">Back</Button>
                </Link>
            </div>
        );
    }

    return <SupplierStatementClient data={data} dict={dict} currency={currency} />;
}
