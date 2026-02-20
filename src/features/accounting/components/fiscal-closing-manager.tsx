"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Lock, Unlock, Loader2, Info } from "lucide-react";
import { closeFiscalYear } from "../actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function FiscalClosingManager() {
    const { dict } = useTranslation() as any;
    const [isLoading, setIsLoading] = useState(false);

    const t = dict.Settings.Accounting.FiscalClosing;

    const handleCloseYear = async () => {
        setIsLoading(true);
        try {
            const res = await closeFiscalYear();
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.message);
            }
        } catch (error: any) {
            toast.error(error.message );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-6">
                    <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                        <Lock className="text-indigo-600" />
                        {t.Title}
                    </CardTitle>
                    <CardDescription className="text-base font-medium text-slate-500">
                        {t.Description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0 space-y-6">

                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-[2rem] p-8 space-y-4">
                        <h3 className="font-black text-indigo-900 text-lg flex items-center gap-2">
                            <Info size={20} />
                            {t.ActionTitle}
                        </h3>
                        <div className="grid gap-3 text-indigo-800 font-bold">
                            <p>{t.Step1}</p>
                            <p>{t.Step2}</p>
                            <p>{t.Step3}</p>
                        </div>
                    </div>

                    <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-6">
                        <div className="h-16 w-16 rounded-2xl bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-200">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-4 flex-1">
                            <p className="text-rose-900 font-black text-lg leading-snug">
                                {t.Warning}
                            </p>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="destructive"
                                        size="lg"
                                        className="rounded-2xl px-10 py-7 text-lg font-black shadow-xl shadow-rose-100 transition-all hover:scale-105 active:scale-95"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                {t.Progress}
                                            </>
                                        ) : (
                                            <>
                                                <Unlock className="mr-2 h-5 w-5" />
                                                {t.CloseButton}
                                            </>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="rounded-[2.5rem] p-8 border-none shadow-2xl">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-2xl font-black text-slate-900">{t.ConfirmTitle}</AlertDialogTitle>
                                        <AlertDialogDescription className="text-base font-bold text-slate-500 py-4 italic">
                                            {t.ConfirmMessage}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="gap-3 mt-4">
                                        <AlertDialogCancel className="rounded-xl font-bold py-6 px-8 border-slate-100 hover:bg-slate-50">{dict.Common.Cancel}</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={handleCloseYear}
                                            className="rounded-xl font-black py-6 px-8 bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-100"
                                        >
                                            {t.CloseButton}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
