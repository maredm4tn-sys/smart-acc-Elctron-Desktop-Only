"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

interface SettingsContextType {
    settings: any;
    updateSettingsLocally: (newSettings: any) => void;
    currency: string;
    companyName: string;
    numeralSystem: 'latn' | 'arab';
    taxEnabled: boolean;
    taxRate: number;
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
    const [showZoomIndicator, setShowZoomIndicator] = useState(false);

    useEffect(() => {
        const applyZoom = (factor: number) => {
            if (typeof window !== "undefined" && (window as any).electron?.setZoomFactor) {
                (window as any).electron.setZoomFactor(factor);
            }
        };

        if (settings?.zoomLevel) {
            applyZoom(settings.zoomLevel);
        }

        const handleZoomChange = (newZoom: number) => {
            const roundedZoom = Math.round(newZoom * 100) / 100;
            if (roundedZoom !== settings?.zoomLevel) {
                updateSettingsLocally({ zoomLevel: roundedZoom });
                setShowZoomIndicator(true);
            }
        };

        // Global Keyboard Shortcuts for Zoom
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey || e.metaKey) {
                let newZoom = settings?.zoomLevel || 1.0;
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    handleZoomChange(Math.min(newZoom + 0.1, 2.0));
                } else if (e.key === '-') {
                    e.preventDefault();
                    handleZoomChange(Math.max(newZoom - 0.1, 0.5));
                } else if (e.key === '0') {
                    e.preventDefault();
                    handleZoomChange(1.0);
                }
            }
        };

        // Scroll Wheel Zoom
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey) {
                e.preventDefault();
                let newZoom = settings?.zoomLevel || 1.0;
                if (e.deltaY < 0) {
                    handleZoomChange(Math.min(newZoom + 0.1, 2.0));
                } else if (e.deltaY > 0) {
                    handleZoomChange(Math.max(newZoom - 0.1, 0.5));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('wheel', handleWheel);
        };
    }, [settings?.zoomLevel]);

    useEffect(() => {
        let timeout: NodeJS.Timeout;
        if (showZoomIndicator) {
            timeout = setTimeout(() => setShowZoomIndicator(false), 1500);
        }
        return () => clearTimeout(timeout);
    }, [showZoomIndicator, settings?.zoomLevel]);

    const updateSettingsLocally = (newSettings: any) => {
        setSettings((prev: any) => ({ ...prev, ...newSettings }));
    };

    return (
        <SettingsContext.Provider value={{
            settings,
            updateSettingsLocally,
            currency: settings?.currency || "EGP",
            companyName: settings?.name,
            numeralSystem: settings?.numeralSystem || "latn",
            taxEnabled: !!settings?.taxEnabled,
            taxRate: Number(settings?.taxRate || 14)
        }}>
            {children}
            {showZoomIndicator && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none transition-opacity duration-200">
                    <div className="px-4 py-2 text-lg font-bold shadow-lg border bg-background/95 backdrop-blur rounded-full text-primary">
                        {Math.round((settings?.zoomLevel || 1.0) * 100)}%
                    </div>
                </div>
            )}
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
