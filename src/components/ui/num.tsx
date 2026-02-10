"use client";

import { useSettings } from "@/components/providers/settings-provider";
import { formatNumber } from "@/lib/numbers";
import { useEffect, useState } from "react";

interface NumProps {
    value: number | string;
    precision?: number;
    showGrouping?: boolean;
    className?: string;
}

/**
 * THE UNIVERSAL NUMERAL COMPONENT
 * Use this to render ANY number in the UI.
 * It automatically syncs with global Arabic/Latin settings.
 */
export function Num({ value, precision, showGrouping = false, className }: NumProps) {
    const { numeralSystem } = useSettings();
    const [formatted, setFormatted] = useState<string>('');

    useEffect(() => {
        // We use string conversion to handle IDs and SKUs correctly
        const val = precision !== undefined && typeof value === 'number'
            ? value.toFixed(precision)
            : value;

        setFormatted(formatNumber(val, {
            useGrouping: showGrouping,
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        }));
    }, [value, numeralSystem, precision, showGrouping]);

    return <span className={className}>{formatted || '...'}</span>;
}
