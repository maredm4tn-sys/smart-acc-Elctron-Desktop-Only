"use client";
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { createUnit, getUnits, deleteUnit } from "@/features/inventory/actions";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useTranslation } from '@/components/providers/i18n-provider';
import { ScrollArea } from "@/components/ui/scroll-area";

interface AddUnitDialogProps {
    onUnitAdded?: () => void;
    trigger?: React.ReactNode;
}

export function AddUnitDialog({ onUnitAdded, trigger }: AddUnitDialogProps) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const [units, setUnits] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const { dict } = useTranslation();

    const fetchUnits = async () => {
        setLoadingList(true);
        const data = await getUnits();
        setUnits(data);
        setLoadingList(false);
    };

    useEffect(() => {
        if (open) {
            fetchUnits();
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        try {
            const res = await createUnit(name.trim());
            if (res.success) {
                toast.success(dict.Dialogs.AddUnit.Success);
                setName("");
                fetchUnits();
                if (onUnitAdded) onUnitAdded();
            } else {
                toast.error((res as any).message || dict.Common?.Error);
            }
        } catch (error) {
            toast.error(dict.Common?.Error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm(dict.Dialogs.AddUnit.DeleteConfirm)) return;
        try {
            const res = await deleteUnit(id);
            if (res.success) {
                toast.success(res.message);
                fetchUnits();
                if (onUnitAdded) onUnitAdded();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error(dict.Common?.Error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="outline" size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> {dict.Common.CreateNew}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{dict.Dialogs.AddUnit.Title}</DialogTitle>
                    <DialogDescription>
                        {dict.Dialogs.AddUnit.Description}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 grid gap-2">
                            <Label htmlFor="unit-name" className="text-right">{dict.Dialogs.AddUnit.Name}</Label>
                            <Input
                                id="unit-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={dict.Dialogs.AddUnit.Placeholder}
                                required
                                className="text-right"
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : dict.Dialogs.AddUnit.Save}
                        </Button>
                    </div>
                </form>

                <div className="mt-6 space-y-4">
                    <h3 className="font-bold text-sm text-right border-b pb-2">{dict.Dialogs.AddUnit.List}</h3>
                    <ScrollArea className="h-[200px] pr-4">
                        {loadingList ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-400" /></div>
                        ) : units.length === 0 ? (
                            <p className="text-center text-slate-400 py-4 text-sm">{dict.Dialogs.AddUnit.NoUnits}</p>
                        ) : (
                            <div className="space-y-2">
                                {units.map((u) => (
                                    <div key={u.id} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border group">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleDelete(u.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        <span className="text-sm font-medium">{u.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter className="mt-4 border-t pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full">
                        {dict.Common.Close}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
