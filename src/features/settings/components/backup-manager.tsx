"use client";

import React, { useState, useEffect } from 'react';
import {
    Card, CardHeader, CardTitle, CardContent
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import {
    ShieldCheck, Download, Upload, Clock, Folder,
    Send, Zap, Save, Trash2, Plus, AlertTriangle, Mail
} from "lucide-react";
import { useTranslation } from "@/components/providers/i18n-provider";
import { toast } from "sonner";

import { updateSettings } from "../actions";

interface BackupManagerProps {
    initialData: any;
}

export function BackupManager({ initialData: settings }: BackupManagerProps) {
    const { dict } = useTranslation();
    const [loading, setLoading] = useState(false);

    // Auto Backup States
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(settings?.backup?.autoEnabled ?? false);
    const [autoBackupTimes, setAutoBackupTimes] = useState<string[]>(settings?.backup?.autoTimes ?? ["23:00"]);
    const [autoBackupPath, setAutoBackupPath] = useState(settings?.backup?.localPath ?? "");

    // Telegram States
    const [telegramBackupEnabled, setTelegramBackupEnabled] = useState(settings?.backup?.telegramEnabled ?? false);
    const [telegramBotToken, setTelegramBotToken] = useState(settings?.backup?.telegramBotToken ?? "");
    const [telegramChatId, setTelegramChatId] = useState(settings?.backup?.telegramChatId ?? "");

    // Email States
    const [emailBackupEnabled, setEmailBackupEnabled] = useState(settings?.backup?.emailEnabled ?? false);
    const [smtpHost, setSmtpHost] = useState(settings?.backup?.smtpHost ?? "");
    const [smtpPort, setSmtpPort] = useState(settings?.backup?.smtpPort ?? 465);
    const [smtpUser, setSmtpUser] = useState(settings?.backup?.smtpUser ?? "");
    const [smtpPass, setSmtpPass] = useState(settings?.backup?.smtpPass ?? "");
    const [backupRecipientEmail, setBackupRecipientEmail] = useState(settings?.backup?.recipientEmail ?? "");

    const handleSaveSettings = async () => {
        setLoading(true);
        try {
            const updateData = {
                autoBackupEnabled,
                autoBackupTimes: JSON.stringify(autoBackupTimes),
                autoBackupPath,
                telegramEnabled: telegramBackupEnabled,
                telegramBackupEnabled, // Both names for safety
                telegramBotToken,
                telegramChatId,
                emailEnabled: emailBackupEnabled,
                emailBackupEnabled, // Both names for safety
                smtpHost,
                smtpPort,
                smtpUser,
                smtpPass,
                backupRecipientEmail
            };

            // 1. Save to DB (Next.js Server Action)
            await updateSettings(updateData);

            // 2. Sync with Electron Main Process for auto-schedule
            // @ts-ignore
            if (window.electron && window.electron.updateAutoBackup) {
                // @ts-ignore
                await window.electron.updateAutoBackup({
                    enabled: autoBackupEnabled,
                    times: autoBackupTimes,
                    path: autoBackupPath,
                    emailEnabled: emailBackupEnabled,
                    smtp: { host: smtpHost, port: smtpPort, user: smtpUser, pass: smtpPass, recipient: backupRecipientEmail },
                    telegramEnabled: telegramBackupEnabled,
                    telegram: { token: telegramBotToken, chatId: telegramChatId }
                });
            }

            toast.success(dict.Settings?.Form?.Success || "تم حفظ كافة الإعدادات بنجاح");
        } catch (error: any) {
            toast.error(error.message || "فشل حفظ الإعدادات");
        } finally {
            setLoading(false);
        }
    };

    const handleBackup = async () => {
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.backupDatabase();
            if (result.success) {
                toast.success(dict.Settings?.Backup?.Messages?.BackupSuccess || "Backup Success");
            } else {
                toast.error(result.error || dict.Settings?.Backup?.Messages?.BackupFailed);
            }
        } catch (error) {
            toast.error(dict.Settings?.Backup?.Messages?.UnexpectedError);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async () => {
        const confirmRestore = window.confirm(dict.Settings?.Backup?.Messages?.RestoreWarning);
        if (!confirmRestore) return;

        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.restoreDatabase();
            if (result.success) {
                toast.success(dict.Settings?.Backup?.Messages?.RestoreSuccess);
                setTimeout(() => {
                    // @ts-ignore
                    window.electron.restartApp();
                }, 2000);
            } else if (!result.cancelled) {
                toast.error(result.error || dict.Settings?.Backup?.Messages?.RestoreFailed);
            }
        } catch (error) {
            toast.error(dict.Settings?.Backup?.Messages?.UnexpectedError);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectFolder = async () => {
        try {
            // @ts-ignore
            const result = await window.electron.selectDirectory();
            if (result) setAutoBackupPath(result);
        } catch (error) {
            console.error(error);
        }
    };

    const addBackupTime = () => {
        if (autoBackupTimes.length >= 4) {
            toast.error(dict.Settings?.Backup?.Messages?.MaxTimesReached || "Max 4 times");
            return;
        }
        setAutoBackupTimes([...autoBackupTimes, "12:00"]);
    };

    const updateBackupTime = (index: number, val: string) => {
        const newTimes = [...autoBackupTimes];
        newTimes[index] = val;
        setAutoBackupTimes(newTimes);
    };

    const removeBackupTime = (index: number) => {
        setAutoBackupTimes(autoBackupTimes.filter((_, i) => i !== index));
    };

    const handleTestTelegram = async () => {
        if (!telegramBotToken || !telegramChatId) {
            toast.error(dict.Settings?.Backup?.Messages?.FillTelegramInfo);
            return;
        }
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.testTelegramConfig({
                token: telegramBotToken,
                chatId: telegramChatId
            });
            if (result.success) toast.success(dict.Settings?.Backup?.Messages?.TestTelegramSuccess);
            else toast.error(result.error);
        } catch (err: any) {
            toast.error(err.message || "Failed to test telegram");
        } finally {
            setLoading(false);
        }
    };

    const handleTestEmail = async () => {
        if (!smtpHost || !smtpUser || !smtpPass || !backupRecipientEmail) {
            toast.error(dict.Settings?.Backup?.Messages?.FillEmailInfo);
            return;
        }
        setLoading(true);
        try {
            // @ts-ignore
            const result = await window.electron.testEmailConfig({
                host: smtpHost,
                port: smtpPort,
                user: smtpUser,
                pass: smtpPass,
                recipient: backupRecipientEmail
            });
            if (result.success) toast.success(dict.Settings?.Backup?.Messages?.TestEmailSuccess);
            else toast.error(result.error || "Connection failed");
        } catch (err: any) {
            toast.error(err.message || "Email test failed");
        } finally {
            setLoading(false);
        }
    };

    const applyGmailDefaults = () => {
        setSmtpHost("smtp.gmail.com");
        setSmtpPort(465);
        setEmailBackupEnabled(true);
        toast.info("Gmail settings applied");
    };

    const applyOutlookDefaults = () => {
        setSmtpHost("smtp.office365.com");
        setSmtpPort(587);
        setEmailBackupEnabled(true);
        toast.info("Outlook settings applied");
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto pb-32 px-4 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="text-center space-y-2 mb-8">
                <h1 className="text-4xl font-black text-slate-900 flex items-center justify-center gap-3">
                    <ShieldCheck className="w-10 h-10 text-emerald-600" />
                    {dict.Settings?.Backup?.Title}
                </h1>
                <p className="text-slate-500 font-bold max-w-2xl mx-auto">
                    {dict.Settings?.Backup?.Description}
                </p>
            </div>

            {/* Manual Backup/Restore Card */}
            <Card className="border-emerald-100 shadow-xl shadow-emerald-900/5 overflow-hidden rounded-3xl">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 p-6">
                    <CardTitle className="flex items-center gap-2 text-emerald-800 text-xl font-black">
                        <Download className="h-6 w-6" />
                        {dict.Settings?.Backup?.BackupNow}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-900 rounded-2xl border-2 ring-4 ring-amber-500/5">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <div className="mr-2">
                            <AlertTitle className="font-black text-amber-800 mb-1">{dict.Settings?.Backup?.AlertTitle}</AlertTitle>
                            <AlertDescription className="font-bold text-amber-700/80 leading-relaxed">
                                {dict.Settings?.Backup?.AlertDescription}
                            </AlertDescription>
                        </div>
                    </Alert>
                    <div className="flex flex-col md:flex-row gap-6">
                        <Button
                            onClick={handleBackup}
                            disabled={loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-16 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all text-white"
                        >
                            <Download className="ml-3 h-6 w-6" />
                            {loading ? dict.Common?.Loading : dict.Settings?.Backup?.BackupNow}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={handleRestore}
                            disabled={loading}
                            className="flex-1 border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-50 h-16 rounded-2xl font-black text-lg active:scale-95 transition-all outline-none ring-0 focus:ring-0"
                        >
                            <Upload className="ml-3 h-6 w-6" />
                            {dict.Settings?.Backup?.RestoreFromFile}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 1. Scheduled Backup System */}
                <Card className="border-blue-100 shadow-xl shadow-blue-900/5 overflow-hidden rounded-3xl">
                    <CardHeader className="bg-blue-50/50 border-b border-blue-100 p-6">
                        <CardTitle className="flex items-center gap-2 text-blue-800 text-xl font-black">
                            <Clock className="h-6 w-6" />
                            {dict.Settings?.Backup?.ScheduledSystem}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-5 bg-blue-50/30 rounded-3xl border border-blue-100">
                            <div className="space-y-1">
                                <Label htmlFor="auto-enabled" className="text-base font-black text-slate-800">{dict.Settings?.Backup?.EnableScheduled}</Label>
                                <p className="text-xs text-slate-500 font-bold">{dict.Settings?.Backup?.ScheduledHint}</p>
                            </div>
                            <Switch id="auto-enabled" checked={autoBackupEnabled} onCheckedChange={setAutoBackupEnabled} className="scale-110" />
                        </div>

                        <div className={`space-y-4 transition-all ${!autoBackupEnabled ? 'opacity-30 pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between">
                                <Label className="font-bold text-slate-700">{dict.Settings?.Backup?.DailySlots}</Label>
                                <Button size="sm" variant="outline" onClick={addBackupTime} className="rounded-xl border-blue-200 text-blue-600 h-9 px-4 font-bold">
                                    <Plus className="w-4 h-4 ml-1" /> {dict.Settings?.Backup?.AddSlot}
                                </Button>
                            </div>
                            <div className="space-y-3">
                                {autoBackupTimes.map((time, index) => {
                                    const [h, m] = time.split(':');
                                    const hour = parseInt(h);
                                    const period = hour >= 12 ? dict.Common?.PM : dict.Common?.AM;
                                    const h12 = hour % 12 || 12;
                                    const time12Str = `${h12}:${m} ${period}`;
                                    return (
                                        <div key={index} className="flex items-center gap-4 p-3 bg-white border border-slate-100 rounded-2xl shadow-sm">
                                            <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-black text-xs shrink-0">{index + 1}</div>
                                            <Input type="time" value={time} onChange={(e) => updateBackupTime(index, e.target.value)} className="h-12 rounded-2xl text-xl font-bold font-mono text-center flex-1 bg-slate-50/50 border-slate-200 focus:bg-white transition-colors" />
                                            {autoBackupTimes.length > 1 && (
                                                <Button variant="ghost" size="icon" onClick={() => removeBackupTime(index)} className="h-11 w-11 text-slate-300 hover:text-red-500 rounded-xl"><Trash2 /></Button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Folder Configuration */}
                <Card className="border-slate-100 shadow-xl shadow-slate-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-6">
                        <CardTitle className="flex items-center gap-2 text-slate-800 text-xl font-black">
                            <Folder className="h-6 w-6 text-blue-600" />
                            {dict.Settings?.Backup?.LocalFolder}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4">
                        <div className="flex gap-2">
                            <Input value={autoBackupPath} readOnly placeholder={dict.Common?.SelectFolder} className="h-14 rounded-2xl truncate font-bold bg-slate-50" />
                            <Button variant="outline" onClick={handleSelectFolder} className="h-14 w-14 rounded-2xl"><Folder /></Button>
                        </div>
                        <p className="text-xs font-bold text-slate-400 italic px-2">*{dict.Settings?.Backup?.PathHint}</p>
                    </CardContent>
                </Card>

                {/* 3. Telegram Cloud Backup */}
                <Card className="border-sky-100 shadow-xl shadow-sky-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-sky-50/50 border-b border-sky-100 p-6">
                        <CardTitle className="flex items-center gap-2 text-sky-800 text-xl font-black">
                            <Send className="h-6 w-6" />
                            {dict.Settings?.Backup?.TelegramTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="flex items-center justify-between p-4 bg-sky-50/30 rounded-2xl border border-sky-100">
                            <Label htmlFor="tg-enabled" className="font-bold text-slate-700">{dict.Settings?.Backup?.EnableTelegram}</Label>
                            <Switch id="tg-enabled" checked={telegramBackupEnabled} onCheckedChange={setTelegramBackupEnabled} />
                        </div>
                        <div className={`space-y-4 transition-all ${!telegramBackupEnabled ? 'opacity-30 grayscale' : ''}`}>
                            <div className="grid grid-cols-1 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{dict.Settings?.Backup?.BotToken}</Label>
                                    <Input placeholder="123456:ABC..." value={telegramBotToken} onChange={(e) => setTelegramBotToken(e.target.value)} className="h-12 rounded-2xl font-mono text-xs" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{dict.Settings?.Backup?.ChatID}</Label>
                                    <Input placeholder="100987xxx" value={telegramChatId} onChange={(e) => setTelegramChatId(e.target.value)} className="h-12 rounded-2xl font-mono text-xs" />
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                onClick={handleTestTelegram}
                                disabled={loading || !telegramBotToken}
                                className="w-full h-11 rounded-xl border-sky-200 text-sky-700 hover:bg-sky-100/50 gap-2 font-black transition-all"
                            >
                                <Zap size={16} />
                                {dict.Settings?.Backup?.TestTelegram || "اختبار الاتصال"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* 4. Email Cloud Backup */}
                <Card className="border-indigo-100 shadow-xl shadow-indigo-900/5 rounded-3xl overflow-hidden">
                    <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 p-6">
                        <CardTitle className="flex items-center gap-2 text-indigo-800 text-xl font-black">
                            <Mail className="h-6 w-6" />
                            {dict.Settings?.Backup?.EmailTitle}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-5">
                        <div className="flex items-center justify-between p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100">
                            <Label htmlFor="em-enabled" className="font-bold text-slate-700">{dict.Settings?.Backup?.EnableEmail}</Label>
                            <Switch id="em-enabled" checked={emailBackupEnabled} onCheckedChange={setEmailBackupEnabled} />
                        </div>
                        <div className={`space-y-4 transition-all ${!emailBackupEnabled ? 'opacity-30 grayscale' : ''}`}>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400">{dict.Settings?.Backup?.SmtpHost}</Label>
                                    <Input placeholder="smtp.gmail.com" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400">{dict.Settings?.Backup?.Port}</Label>
                                    <Input type="number" placeholder="465" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} className="h-10 rounded-xl" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400">{dict.Settings?.Backup?.UserEmail}</Label>
                                    <Input placeholder="user@gmail.com" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black text-slate-400">{dict.Settings?.Backup?.Password}</Label>
                                    <Input type="password" placeholder="••••••••" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} className="h-10 rounded-xl" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400">{dict.Settings?.Backup?.RecipientEmail}</Label>
                                <Input placeholder="backup@example.com" value={backupRecipientEmail} onChange={(e) => setBackupRecipientEmail(e.target.value)} className="h-10 rounded-xl" />
                            </div>
                            <div className="space-y-4 pt-4 border-t border-indigo-50">
                                <Button
                                    variant="outline"
                                    onClick={handleTestEmail}
                                    disabled={loading || !smtpHost}
                                    className="w-full h-12 rounded-2xl border-indigo-200 text-indigo-700 font-black bg-indigo-50/50 hover:bg-indigo-100/50 gap-3 shadow-sm transition-all"
                                >
                                    <Zap size={18} className="fill-indigo-200" /> {dict.Common?.Test || "اختبار الاتصال بالبريد"}
                                </Button>

                                <div className="flex items-center gap-2 py-1">
                                    <div className="h-[1px] flex-1 bg-indigo-50"></div>
                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{dict.Settings?.Backup?.QuickSetup || "Quick Setup"}</span>
                                    <div className="h-[1px] flex-1 bg-indigo-50"></div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <Button variant="ghost" size="sm" onClick={applyGmailDefaults} className="h-10 bg-red-50 text-red-700 font-bold border border-red-100 rounded-xl hover:bg-red-100 flex items-center justify-center gap-2 group">
                                        <div className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-ping" />
                                        Gmail
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={applyOutlookDefaults} className="h-10 bg-blue-50 text-blue-700 font-bold border border-blue-100 rounded-xl hover:bg-blue-100 flex items-center justify-center gap-2 group">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 group-hover:animate-ping" />
                                        Outlook
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Global Save Action */}
            <div className={`fixed bottom-8 ${dict.Common?.Direction === 'rtl' ? 'lg:right-72 right-0 left-0' : 'lg:left-72 left-0 right-0'} z-[100] flex justify-center pointer-events-none`}>
                <div className="pointer-events-auto">
                    <Button
                        onClick={handleSaveSettings}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-700 h-16 rounded-3xl font-black min-w-[340px] px-12 gap-4 shadow-[0_15px_40px_-10px_rgba(79,70,229,0.3)] hover:scale-105 active:scale-95 transition-all text-xl border-4 border-white text-white"
                    >
                        <Save className="h-7 w-7 text-indigo-200" />
                        {loading ? dict.Common?.Loading : (dict.Settings?.Form?.SaveAll || "حفظ كافة الإعدادات")}
                    </Button>
                </div>
            </div>
        </div>
    );
}
