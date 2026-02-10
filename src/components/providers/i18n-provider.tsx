"use client";

import React, { createContext, useContext } from "react";
import { Dictionary, Locale } from "@/lib/i18n-server";

// We create a context to pass dictionary down to client components WITHOUT making them async
// This is because Client Components cannot be async.

type I18nContextType = {
    dict: Dictionary;
    lang: Locale;
    dir: "rtl" | "ltr";
};

const I18nContext = createContext<I18nContextType | null>(null);

function createSafeDict(obj: any, path: string = ""): any {
    return new Proxy(obj || {}, {
        get(target, prop) {
            // Handle React and internal properties
            if (prop === '$$typeof') return undefined;
            if (prop === 'then') return undefined;
            if (typeof prop !== 'string') return Reflect.get(target, prop);
            if (prop === 'prototype' || prop === 'constructor' || prop === 'toJSON') {
                return target[prop];
            }

            const value = target[prop];
            const newPath = path ? `${path}.${prop}` : prop;

            if (value === undefined) {
                const errorMsg = `MISSING_KEY: ${newPath}`;
                console.error(errorMsg);
                return errorMsg;
            }

            if (typeof value === 'object' && value !== null) {
                return createSafeDict(value, newPath);
            }

            return value;
        }
    });
}

export function I18nProvider({
    children,
    dict,
    lang
}: {
    children: React.ReactNode,
    dict: Dictionary,
    lang: Locale
}) {
    const dir = lang === "ar" ? "rtl" : "ltr";
    // Wrap the dictionary in a safe proxy
    const safeDict = createSafeDict(dict);

    return (
        <I18nContext.Provider value={{ dict: safeDict, lang, dir }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error("useTranslation must be used within an I18nProvider");
    }
    return context;
}
