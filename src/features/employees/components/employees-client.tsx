"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Wallet, CreditCard, ClipboardList } from "lucide-react";
import { EmployeeList } from "./employee-list";
import { PayrollForm } from "./payroll-form";
import { AdvanceForm } from "./advance-form";
import { EmployeeReports } from "./employee-reports";
import { AttendanceView } from "./attendance-view";
import { useTranslation } from "@/components/providers/i18n-provider";
import { TranslationKeys } from "@/lib/translation-types";

export function EmployeesClient({ initialEmployees = [], dict, session }: { initialEmployees?: any[], dict: TranslationKeys, session: any }) {
    const [employees, setEmployees] = useState(initialEmployees);

    const { lang } = useTranslation();
    const isAdmin = session?.role?.toUpperCase() === 'ADMIN' || session?.role?.toUpperCase() === 'SUPER_ADMIN';

    const isAr = lang === "ar";

    return (
        <Tabs defaultValue="list" className="w-full" dir={isAr ? "rtl" : "ltr"}>
            <TabsList className={`grid ${isAdmin ? 'grid-cols-5' : 'grid-cols-3'} w-full max-w-5xl mx-auto h-auto p-1.5 bg-slate-100/50 border border-slate-200/50 rounded-2xl shadow-sm gap-1`}>
                <TabsTrigger value="list" className="gap-2 py-2.5 px-4 rounded-xl data-[state=active]:shadow-md transition-all">
                    <Users size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">{dict.EmployeesManagement.Tabs.List}</span>
                </TabsTrigger>

                {isAdmin && (
                    <TabsTrigger value="payroll" className="gap-2 py-2.5 px-4 rounded-xl data-[state=active]:shadow-md transition-all">
                        <Wallet size={16} className="shrink-0" />
                        <span className="whitespace-nowrap">{dict.EmployeesManagement.Tabs.Payroll}</span>
                    </TabsTrigger>
                )}

                <TabsTrigger value="advances" className="gap-2 py-2.5 px-4 rounded-xl data-[state=active]:shadow-md transition-all">
                    <CreditCard size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">{dict.EmployeesManagement.Tabs.Advances}</span>
                </TabsTrigger>

                <TabsTrigger value="attendance" className="gap-2 py-2.5 px-4 rounded-xl data-[state=active]:shadow-md transition-all">
                    <ClipboardList size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">{dict.EmployeesManagement.Tabs.Attendance}</span>
                </TabsTrigger>

                {isAdmin && (
                    <TabsTrigger value="reports" className="gap-2 py-2.5 px-4 rounded-xl data-[state=active]:shadow-md transition-all">
                        <ClipboardList size={16} className="shrink-0" />
                        <span className="whitespace-nowrap">{dict.EmployeesManagement.Tabs.Reports}</span>
                    </TabsTrigger>
                )}
            </TabsList>

            <TabsContent value="list" className="mt-6">
                <EmployeeList initialEmployees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="payroll" className="mt-6">
                <PayrollForm employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="advances" className="mt-6">
                <AdvanceForm employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="attendance" className="mt-6">
                <AttendanceView employees={employees} dict={dict} />
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
                <EmployeeReports employees={employees} dict={dict} />
            </TabsContent>
        </Tabs>
    );
}

