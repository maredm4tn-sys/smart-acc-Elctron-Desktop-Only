"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";

export function ReportsBackButton() {
    const router = useRouter();
    const { lang: locale } = useTranslation() as any;
    const isRtl = locale === "ar";

    return (
        <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/reports")}
            className="flex items-center gap-2 mb-4 hover:bg-muted"
        >
            {isRtl ? (
                <ChevronRight className="h-4 w-4" />
            ) : (
                <ChevronLeft className="h-4 w-4" />
            )}
            <span>{isRtl ? "الرجوع للتقارير" : "Back to Reports"}</span>
        </Button>
    );
}
