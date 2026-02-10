/**
 * THE CENTRAL SOURCE OF TRUTH FOR NUMERALS
 * This utility handles all number formatting globally.
 * It is context-aware and respects user settings.
 */

export type NumeralSystem = 'latn' | 'arab';

/**
 * Gets the current numeral system from localStorage (Safe for Client Side)
 */
export function getStoredNumeralSystem(): NumeralSystem {
    if (typeof window === 'undefined') return 'latn';
    return (localStorage.getItem('app_numeral_system') as NumeralSystem) || 'latn';
}

/**
 * The Master Formatter
 * Used to format any value into the selected numeral system correctly.
 */
export function formatNumber(
    value: number | string,
    options?: Intl.NumberFormatOptions
): string {
    if (value === null || value === undefined) return '';

    // Get system directly from the source of truth (localStorage)
    const system = getStoredNumeralSystem();
    const strValue = String(value);

    // SMARTER DETECTION:
    // If the value is a string and contains non-numeric chars (like / , - : or letters)
    // we should NOT use Intl.NumberFormat because it will strip the string (e.g. "2/9/2026" becomes "2")
    const isPlainNumber = typeof value === 'number' || /^-?\d*\.?\d+$/.test(strValue);

    if (!isPlainNumber) {
        // Just perform a straight digit replacement to keep the format (Date, SKU, phone) intact
        return system === 'arab' ? replaceWithArabic(strValue) : replaceWithLatin(strValue);
    }

    const num = typeof value === 'string' ? parseFloat(strValue) : value;
    const locale = system === 'arab' ? 'ar-EG' : 'en-US';

    const formatter = new Intl.NumberFormat(locale, {
        ...options,
        // Default to not using grouping (commas) for simpler IDs/Codes
        useGrouping: options?.useGrouping ?? false,
    });

    let result = formatter.format(num);

    // Absolute fallback for consistency 1000%
    if (system === 'arab') {
        return replaceWithArabic(result);
    } else {
        return replaceWithLatin(result);
    }
}

/**
 * Simple Digit Replacers
 */
function replaceWithArabic(str: string): string {
    const map: Record<string, string> = {
        '0': '٠', '1': '١', '2': '٢', '3': '٣', '4': '٤',
        '5': '٥', '6': '٦', '7': '٧', '8': '٨', '9': '٩'
    };
    return str.replace(/[0-9]/g, (d) => map[d] || d);
}

function replaceWithLatin(str: string): string {
    const map: Record<string, string> = {
        '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
        '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    return str.replace(/[٠-٩]/g, (d) => map[d] || d);
}

/**
 * Currency Specific Formatter
 */
export function formatMoney(amount: number | string, currency: string = 'EGP'): string {
    const formatted = formatNumber(amount, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
        useGrouping: true
    });
    return `${formatted} ${currency}`;
}
