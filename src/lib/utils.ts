import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Global dynamic currency formatter.
 * Automatically replaces "EGP" with the user's selected currency.
 */
import { formatMoney } from "./numbers";

export function formatCurrency(amount: number | string, currencyOverride?: string) {
  let currency = currencyOverride;
  if (typeof window !== "undefined") {
    currency = currency || localStorage.getItem("app_currency") || "EGP";
  }
  return formatMoney(amount, currency || "EGP");
}

export function formatNumber(val: number | string) {
  let numeralSystem = "latn";
  if (typeof window !== "undefined") {
    numeralSystem = localStorage.getItem("app_numeral_system") || "latn";
  }
  const locale = numeralSystem === "arab" ? "ar-EG-u-nu-arab" : "en-US";
  return new Intl.NumberFormat(locale).format(Number(val));
}
