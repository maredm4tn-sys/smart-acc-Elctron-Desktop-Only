
"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import Image from "next/image";
import { Loader2, Lock, User, AlertCircle, ShieldCheck, ChevronLeft } from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { TranslationKeys } from "@/lib/translation-types";
import { login } from "@/features/auth/actions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const { dict, dir } = useTranslation();
    const [isPending, setIsPending] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsPending(true);
        setError(null);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await login(null, formData) as { success?: boolean, error?: string };

            if (result?.error) {
                setError(result.error);
                toast.error(result.error);
                setIsPending(false);
            } else {
                const { getSession } = await import("@/features/auth/actions");
                const session = await getSession();

                if (session) {
                    localStorage.setItem("tauri_session", JSON.stringify(session));
                    document.cookie = `tauri_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=86400`;
                    window.location.href = "/dashboard";
                } else {
                    setError(dict.Login.SessionError);
                    setIsPending(false);
                }
            }
        } catch (err: any) {
            setError(dict.Login.ConnectionError);
            setIsPending(false);
        }
    }

    return (
        <div className="relative min-h-screen bg-[#0f172a] flex items-center justify-center p-6 overflow-hidden selection:bg-blue-500/30" dir={dir}>
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />

            <div className="w-full max-w-[440px] z-10 space-y-8 animate-in fade-in zoom-in duration-700">
                {/* Logo Section */}
                <div className="flex flex-col items-center space-y-6">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <div className="relative w-28 h-28 bg-white/10 backdrop-blur-xl p-5 rounded-full border border-white/20 shadow-2xl overflow-hidden flex items-center justify-center">
                            <Image
                                src="/logo.png"
                                alt="Logo"
                                width={120}
                                height={120}
                                className="object-contain transition-transform group-hover:scale-110 duration-500 drop-shadow-2xl"
                                priority
                            />
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">
                            {dict.Login.Title}
                        </h1>
                        <div className="flex items-center justify-center gap-2 text-slate-400 text-sm font-medium">
                            <ShieldCheck className="w-4 h-4 text-blue-400" />
                            <span>{dict.Login.Subtitle}</span>
                        </div>
                    </div>
                </div>

                {/* Login Card */}
                <Card className="bg-white/5 backdrop-blur-2xl border border-white/10 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] rounded-[2.5rem] overflow-hidden">
                    <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400" />

                    <CardContent className="p-10 space-y-8">
                        <div className="space-y-2 text-center">
                            <h2 className="text-xl font-bold text-white">{dict.Login.LoginTitle}</h2>
                            <p className="text-slate-400 text-sm">{dict.Login.LoginSubtitle}</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-2xl text-sm flex items-center gap-3 animate-in slide-in-from-top-2">
                                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                    <span className="font-medium">{error}</span>
                                </div>
                            )}

                            <div className="space-y-2.5">
                                <Label htmlFor="username" className={`text-slate-300 text-sm font-semibold ${dir === 'rtl' ? 'mr-1' : 'ml-1'}`}>
                                    {dict.Login.Username}
                                </Label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors`}>
                                        <User size={20} />
                                    </div>
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                        placeholder={dict.Login.Username}
                                        className={`h-14 ${dir === 'rtl' ? 'pr-12' : 'pl-12'} bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-lg`}
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="space-y-2.5">
                                <Label htmlFor="password" className={`text-slate-300 text-sm font-semibold ${dir === 'rtl' ? 'mr-1' : 'ml-1'}`}>
                                    {dict.Login.Password}
                                </Label>
                                <div className="relative group">
                                    <div className={`absolute inset-y-0 ${dir === 'rtl' ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none text-slate-500 group-focus-within:text-blue-400 transition-colors`}>
                                        <Lock size={20} />
                                    </div>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                        placeholder="••••••••"
                                        className={`h-14 ${dir === 'rtl' ? 'pr-12' : 'pl-12'} bg-white/5 border-white/10 text-white placeholder:text-slate-600 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-sans text-lg tracking-widest`}
                                    />
                                </div>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-14 text-xl bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-black shadow-lg shadow-blue-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
                                disabled={isPending}
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="animate-spin w-6 h-6" />
                                        {dict.Login.Verifying}
                                    </>
                                ) : (
                                    <>
                                        <span>{dict.Login.Button}</span>
                                        {dir === 'rtl' ? (
                                            <ChevronLeft className="w-5 h-5 mt-0.5" />
                                        ) : (
                                            /* No icon or different one for LTR maybe? I'll just leave it or use a right chevron */
                                            null
                                        )}
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer Section */}
                <div className="text-center space-y-6 pt-4 text-slate-500">
                    <p className="text-[10px] uppercase font-black tracking-[0.2em] opacity-40">
                        Smart Accountant Offline Edition v2.2
                    </p>
                </div>
            </div>

            {/* Soft Shadow at the bottom */}
            <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none" />
        </div>
    );
}

