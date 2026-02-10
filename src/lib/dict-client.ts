
const dictionaries = {
    ar: () => import("@/messages/ar.json").then((module) => module.default),
    en: () => import("@/messages/en.json").then((module) => module.default),
};

export async function getDictionary() {
    // In Tauri, we can check locale from localStorage or just default to ar
    const locale = (typeof window !== 'undefined' ? localStorage.getItem("NEXT_LOCALE") : "ar") || "ar";
    const selected = await (dictionaries[locale as 'ar' | 'en'] || dictionaries.ar)();
    return selected;
}
