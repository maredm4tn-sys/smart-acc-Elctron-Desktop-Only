"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "./app-sidebar";
import { MobileNav } from "./mobile-nav";
import { ShiftManager } from "@/features/shifts/components/shift-manager";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardShellProps {
    children: React.ReactNode;
    user: any;
    dict: any;
    isRtl: boolean;
}

export function DashboardShell({ children, user, dict, isRtl }: DashboardShellProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const isPosPage = pathname === "/dashboard/pos";
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Detect Fullscreen state
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const handleResize = () => {
                // Relying ONLY on actual Fullscreen API state to avoid Chrome's height calculation issues
                const isFs = !!document.fullscreenElement;
                setIsFullscreen(isFs);
            };
            handleResize();
            window.addEventListener('resize', handleResize);
            window.addEventListener('fullscreenchange', handleResize);
            window.addEventListener('webkitfullscreenchange', handleResize);
            window.addEventListener('mozfullscreenchange', handleResize);

            return () => {
                window.removeEventListener('resize', handleResize);
                window.removeEventListener('fullscreenchange', handleResize);
                window.removeEventListener('webkitfullscreenchange', handleResize);
                window.removeEventListener('mozfullscreenchange', handleResize);
            };
        }
    }, []);

    const shouldHideSidebar = isPosPage && isFullscreen;

    return (
        <div className="min-h-screen bg-gray-50/50 flex font-sans relative" dir={isRtl ? "rtl" : "ltr"}>
            {/* Desktop Sidebar / Mobile Overlay Sidebar */}
            <div
                className={`fixed inset-0 bg-black/50 z-40 transition-opacity ${!shouldHideSidebar ? 'lg:hidden' : ''} ${isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <div className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 transform ${!shouldHideSidebar ? 'lg:relative lg:translate-x-0' : ''} transition-transform duration-300 ${isSidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full"} no-print`}>
                <AppSidebar user={user} dict={dict} onClose={() => setIsSidebarOpen(false)} isRtl={isRtl} />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {!shouldHideSidebar && (
                    <header className="h-16 md:h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 no-print">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="lg:hidden"
                                onClick={() => setIsSidebarOpen(true)}
                            >
                                <Menu size={24} />
                            </Button>

                            <div className="hidden lg:flex items-center gap-2 text-gray-400 bg-gray-50/50 px-4 py-1.5 rounded-2xl border border-gray-100 shadow-sm">
                                <span className="text-xs font-bold font-mono text-slate-600">
                                    <ClockDisplay />
                                </span>
                                <span className="h-3 w-[1px] bg-gray-200 mx-1"></span>
                                <span className="text-[10px] md:text-xs font-black text-slate-500">
                                    {new Date().toLocaleDateString(isRtl ? 'ar-EG' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </span>
                            </div>

                            <div className="flex items-center">
                                <ShiftManager />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* User profile / notifications icon can go here */}
                        </div>
                    </header>
                )}

                <main className={`flex-1 overflow-auto ${isPosPage ? 'p-1' : 'p-4 md:p-8 pb-24 md:pb-8'} relative`}>
                    {children}
                </main>
            </div>

            {/* Bottom Mobile Nav */}
            <div className="no-print">
                <MobileNav user={user} />
            </div>
        </div>
    );
}

function ClockDisplay() {
    const [time, setTime] = useState<Date | null>(null);

    useEffect(() => {
        setTime(new Date()); // Set initial client time
        const timer = setInterval(() => setTime(new Date()), 1000); // Update every second
        return () => clearInterval(timer);
    }, []);

    if (!time) return <span className="opacity-0">00:00:00 AM</span>; // Placeholder to prevent layout shift

    return (
        <span className="tabular-nums">
            {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
        </span>
    );
}

// Keep the existing file content after this...
