
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { User, Mail, Phone, MapPin, Briefcase, CreditCard, ArrowLeft, Info } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function EmployeeDetailsClient({ employee, dict, currency }: { employee: any, dict: any, currency: string }) {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/employees">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {employee.name}
                        </h1>
                        <p className="text-muted-foreground">{dict.Employees?.Description}</p>
                    </div>
                </div>
                <div>
                    <Badge variant={employee.status === 'active' ? 'secondary' : 'outline'}>
                        {employee.status === 'active' ? dict.Common?.Active : dict.Common?.Inactive}
                    </Badge>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Info size={14} /> {dict.Employees?.Form?.Code}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{employee.code || dict.Common?.NA}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Briefcase size={14} /> {dict.Employees?.Form?.Position}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold">{employee.position || dict.Common?.NA}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <CreditCard size={14} /> {dict.Employees?.Form?.BasicSalary}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-lg font-bold text-emerald-600 dir-ltr">
                            {employee.basicSalary ? formatCurrency(employee.basicSalary, currency) : (dict.Common?.NA)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{dict.Common?.ContactInfo}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span>{employee.phone || dict.Common?.NA}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span>{employee.email || dict.Common?.NA}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span>{employee.address || dict.Common?.NA}</span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">{dict.Employees?.Form?.Notes}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                            {employee.notes || dict.Common?.NA}
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
