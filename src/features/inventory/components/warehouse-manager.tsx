"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HardDrive, Plus, Trash2, Edit2, CheckCircle2, AlertCircle, Loader2, Warehouse } from "lucide-react";
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, seedDefaultWarehouse } from "../warehouse-actions";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

export function WarehouseManager() {
    const { dict } = useTranslation() as any;
    const [warehousesList, setWarehousesList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState(false);

    // Form State
    const [isOpen, setIsOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [isDefault, setIsDefault] = useState(false);

    const t = dict.Inventory?.Warehouses || {
        Title: "Warehouses",
        AddWarehouse: "Add Warehouse",
        Name: "Name",
        Location: "Location",
        IsDefault: "Default",
        Empty: "No warehouses",
        ConfirmDelete: "Are you sure?"
    };

    const fetchWarehouses = async () => {
        setIsLoading(true);
        try {
            const data = await getWarehouses();
            setWarehousesList(data);
        } catch (e) {
            toast.error("Failed to fetch warehouses");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, []);

    const handleSeed = async () => {
        setIsActionLoading(true);
        try {
            const res = await seedDefaultWarehouse();
            if (res.success) {
                toast.success(res.message);
                fetchWarehouses();
            } else {
                toast.error(res.message);
            }
        } catch (e) {
            toast.error("Error seeding default warehouse");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsActionLoading(true);
        try {
            if (editingId) {
                const res = await updateWarehouse({ id: editingId, name, location, isDefault });
                if (res.success) toast.success(dict.Common.UpdateSuccess);
                else toast.error(res.message);
            } else {
                const res = await createWarehouse({ name, location, isDefault });
                if (res.success) toast.success(dict.Common.AddSuccess);
                else toast.error(res.message);
            }
            setIsOpen(false);
            resetForm();
            fetchWarehouses();
        } catch (e) {
            toast.error("Action failed");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(t.ConfirmDelete)) return;
        try {
            await deleteWarehouse(id);
            toast.success(dict.Common.DeleteSuccess);
            fetchWarehouses();
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setName("");
        setLocation("");
        setIsDefault(false);
    };

    const openEdit = (wh: any) => {
        setEditingId(wh.id);
        setName(wh.name);
        setLocation(wh.location || "");
        setIsDefault(wh.isDefault);
        setIsOpen(true);
    };

    return (
        <div className="space-y-6">
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-6 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-800 flex items-center gap-3">
                            <Warehouse className="text-emerald-600" />
                            {t.Title}
                        </CardTitle>
                        <CardDescription className="text-base font-medium text-slate-500">
                            {dict.Inventory?.Description}
                        </CardDescription>
                    </div>
                    <div className="flex gap-2">
                        {warehousesList.length === 0 && (
                            <Button
                                variant="outline"
                                onClick={handleSeed}
                                disabled={isActionLoading}
                                className="rounded-xl font-bold border-slate-200"
                            >
                                {dict.Inventory?.Warehouses?.InitDefault}
                            </Button>
                        )}
                        <Dialog open={isOpen} onOpenChange={setIsOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={resetForm} className="rounded-xl font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-100">
                                    <Plus className="mr-2 h-5 w-5" />
                                    {t.AddWarehouse}
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="rounded-[2.5rem] p-8">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-black font-arabic">{editingId ? (dict.Inventory?.Warehouses?.EditWarehouse) : t.AddWarehouse}</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4 py-4">
                                    <div className="space-y-2 text-right">
                                        <Label className="font-bold">{t.Name}</Label>
                                        <Input value={name} onChange={e => setName(e.target.value)} className="rounded-xl text-right" dir="auto" />
                                    </div>
                                    <div className="space-y-2 text-right">
                                        <Label className="font-bold">{t.Location}</Label>
                                        <Input value={location} onChange={e => setLocation(e.target.value)} className="rounded-xl text-right" dir="auto" />
                                    </div>
                                    <div className="flex items-center space-x-2 space-x-reverse justify-end">
                                        <Label htmlFor="isDefault" className="font-bold cursor-pointer">{t.IsDefault}</Label>
                                        <Checkbox id="isDefault" checked={isDefault} onCheckedChange={(val) => setIsDefault(!!val)} />
                                    </div>
                                </div>
                                <DialogFooter className="gap-2">
                                    <Button variant="ghost" onClick={() => setIsOpen(false)} className="rounded-xl font-bold">{dict.Common?.Cancel}</Button>
                                    <Button onClick={handleSave} disabled={isActionLoading || !name} className="rounded-xl font-black px-8 bg-emerald-600 hover:bg-emerald-700">
                                        {isActionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        {dict.Common?.Save}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent className="px-0">
                    {isLoading ? (
                        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-slate-300" size={40} /></div>
                    ) : warehousesList.length === 0 ? (
                        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                <Warehouse size={32} />
                            </div>
                            <p className="text-slate-500 font-bold text-lg">{t.Empty}</p>
                            <Button variant="ghost" onClick={handleSeed} className="text-emerald-600 font-black">{dict.Inventory?.Warehouses?.InitDefaultHint}</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {warehousesList.map(wh => (
                                <Card key={wh.id} className="rounded-[2rem] border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                                    <CardContent className="p-6">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:scale-110 transition-transform">
                                                <Warehouse size={24} />
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button size="icon" variant="ghost" onClick={() => openEdit(wh)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-emerald-600">
                                                    <Edit2 size={16} />
                                                </Button>
                                                {!wh.isDefault && (
                                                    <Button size="icon" variant="ghost" onClick={() => handleDelete(wh.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="text-xl font-black text-slate-800 flex items-center gap-2">
                                                {wh.name}
                                                {wh.isDefault && <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] rounded-full uppercase tracking-widest font-black">Default</span>}
                                            </h4>
                                            <p className="text-slate-500 font-medium flex items-center gap-1">
                                                <HardDrive size={14} />
                                                {wh.location}
                                            </p>
                                        </div>
                                    </CardContent>
                                    <div className="h-1.5 bg-emerald-500 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

