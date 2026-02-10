
"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PrintButtonProps {
    label: string;
}

export function CustomerPrintButton({ label, customerId }: { label: string, customerId: number }) {
    const handlePrint = () => {
        window.open(`/print/customers/${customerId}`, '_blank');
    };

    return (
        <Button variant="outline" className="gap-2 no-print" onClick={handlePrint}>
            <Printer className="h-4 w-4" />
            {label}
        </Button>
    );
}
