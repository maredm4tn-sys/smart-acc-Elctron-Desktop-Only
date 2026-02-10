
import ar from "@/messages/ar.json";
import en from "@/messages/en.json";

import { TranslationKeys } from "./translation-types";

const dictionaries: Record<Locale, TranslationKeys> = {
    ar: ar as unknown as TranslationKeys,
    en: en as unknown as TranslationKeys
};

export type Locale = "ar" | "en";
export type Dictionary = TranslationKeys;

export async function getDictionary(locale?: string): Promise<TranslationKeys> {
    let lang = locale;

    if (!lang) {
        try {
            // Dynamic import for cookies only to avoid SSR issues
            const { cookies } = await import("next/headers");
            const cookieStore = await cookies();
            lang = cookieStore.get("NEXT_LOCALE")?.value || "en";
        } catch (e) {
            lang = "en";
        }
    }

    const dict = dictionaries[lang === "ar" ? "ar" : "en"];
    return dict || dictionaries.en;
}

export async function getLocale() {
    try {
        const { cookies } = await import("next/headers");
        const cookieStore = await cookies();
        return cookieStore.get("NEXT_LOCALE")?.value || "en";
    } catch (e) {
        return "en";
    }
}
