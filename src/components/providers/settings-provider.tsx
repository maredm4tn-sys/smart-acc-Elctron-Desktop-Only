"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SettingsContextType {
    settings: any;
    updateSettingsLocally: (newSettings: any) => void;
    currency: string;
    companyName: string;
    numeralSystem: 'latn' | 'arab';
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({
    children,
    initialSettings
}: {
    children: React.ReactNode;
    initialSettings: any;
}) {
    const [settings, setSettings] = useState(initialSettings);

    // Sync to LocalStorage and Apply Body Class
    useEffect(() => {
        if (settings?.currency) {
            localStorage.setItem("app_currency", settings.currency);
        }
        if (settings?.numeralSystem) {
            localStorage.setItem("app_numeral_system", settings.numeralSystem);

            // Apply global class for "One Idea" numeral transformation
            if (settings.numeralSystem === 'arab') {
                document.body.classList.add('numeral-arab');
            } else {
                document.body.classList.remove('numeral-arab');
            }
        }
    }, [settings?.currency, settings?.numeralSystem]);

    // Apply Zoom Factor (Electron Only)
    useEffect(() => {
        const applyZoom = (factor: number) => {
            if (typeof window !== "undefined" && (window as any).electron?.setZoomFactor) {
                (window as any).electron.setZoomFactor(factor);
            }
        };

        if (settings?.zoomLevel) {
            applyZoom(settings.zoomLevel);
        }

        // Global Keyboard Shortcuts for Zoom
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                let newZoom = settings?.zoomLevel || 1.0;
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    newZoom = Math.min(newZoom + 0.1, 2.0);
                    updateSettingsLocally({ zoomLevel: newZoom });
                } else if (e.key === '-') {
                    e.preventDefault();
                    newZoom = Math.max(newZoom - 0.1, 0.5);
                    updateSettingsLocally({ zoomLevel: newZoom });
                } else if (e.key === '0') {
                    e.preventDefault();
                    updateSettingsLocally({ zoomLevel: 1.0 });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [settings?.zoomLevel]);

    const updateSettingsLocally = (newSettings: any) => {
        setSettings((prev: any) => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettingsLocally,
            currency: settings?.currency || "EGP",
            companyName: settings?.name || "المحاسب الذكي",
            numeralSystem: settings?.numeralSystem || "latn"
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
};
