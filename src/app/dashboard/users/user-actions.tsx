"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash2, Loader2, Shield, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { deleteUser, updateUser } from "@/features/auth/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useTranslation } from "@/components/providers/i18n-provider";

interface UserActionsProps {
    user: any;
}

export function UserActions({ user }: UserActionsProps) {
    const { dict: rawDict, lang } = useTranslation();
    const dict = rawDict as any;
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // Roles and Permissions logic mirrored from AddUserDialog
    const isDefaultRole = DEFAULT_ROLES.some(r => r.id === user.role);
    const [selectedRole, setSelectedRole] = useState(isDefaultRole ? user.role : "custom");
    const [customRoleName, setCustomRoleName] = useState(isDefaultRole ? "" : user.role);
    const [permissions, setPermissions] = useState<string[]>(() => {
        try {
            return user.permissions ? JSON.parse(user.permissions) : (ROLE_PERMISSIONS[user.role] || []);
        } catch (e) {
            return ROLE_PERMISSIONS[user.role] || [];
        }
    });

    const handleRoleChange = (role: string) => {
        setSelectedRole(role);
        if (role !== 'custom') {
            setPermissions(ROLE_PERMISSIONS[role] || []);
        }
    };

    const togglePermission = (id: string) => {
        setPermissions(prev =>
            prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
        );
    };

    const toggleAll = () => {
        if (permissions.length === ALL_PERMISSIONS.length) {
            setPermissions([]);
        } else {
            setPermissions(ALL_PERMISSIONS.map(p => p.id));
        }
    };

    const handleDelete = async () => {
        if (!confirm(dict.Users.Dialog.DeleteConfirm)) return;

        const res = await deleteUser(user.id);
        if (res.error) {
            toast.error(res.error);
        } else {
            toast.success(dict.Users.Dialog.DeleteSuccess);
        }
    };

    const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const formData = new FormData(e.currentTarget);

        const roleToSave = selectedRole === 'custom' ? customRoleName : selectedRole;

        const res = await updateUser(user.id, {
            fullName: formData.get("fullName") as string,
            role: roleToSave,
            isActive: user.isActive,
            phone: formData.get("phone") as string,
            address: formData.get("address") as string,
            password: formData.get("password") as string || undefined,
            permissions: JSON.stringify(permissions)
        });

        setLoading(false);

        if (res.error) {
            toast.error(res.error);
        } else {
            setEditOpen(false);
            toast.success(dict.Users.Dialog.UpdateSuccess);
        }
    };

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditOpen(true)}>
                        <Pencil className="mr-2 h-4 w-4" /> {dict.Users.Dialog.Edit}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDelete} className="text-red-600 focus:text-red-600">
                        <Trash2 className="mr-2 h-4 w-4" /> {dict.Users.Dialog.Delete}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Edit Dialog */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[95vh] overflow-y-auto rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-900 border-b pb-4 flex items-center justify-between">
                            <span>{dict.Users.Dialog.EditTitle}</span>
                            <div className="flex items-center gap-2">
                                <Button type="button" variant="outline" size="sm" onClick={toggleAll} className="h-7 text-[10px] font-black uppercase tracking-tighter">
                                    {permissions.length === ALL_PERMISSIONS.length ? dict.Users.Dialog.DeselectAll : dict.Users.Dialog.SelectAll}
                                </Button>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-6 mt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.FullName}</Label>
                                <Input name="fullName" defaultValue={user.fullName} required className="rounded-lg border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.Username}</Label>
                                <Input name="username" defaultValue={user.username} disabled className="font-mono dir-ltr text-left rounded-lg bg-slate-50 border-slate-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.Password} ({dict.Users.Dialog.LeaveEmptyPassword})</Label>
                                <Input name="password" type="password" className="font-mono dir-ltr text-left rounded-lg border-slate-200" placeholder="*******" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.Role}</Label>
                                <div className="flex gap-2">
                                    <select
                                        value={selectedRole}
                                        onChange={(e) => handleRoleChange(e.target.value)}
                                        title="Role selection"
                                        className="flex-1 h-10 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 transition-all"
                                    >
                                        {DEFAULT_ROLES.map(role => (
                                            <option key={role.id} value={role.id}>
                                                {dict.Users.RolesList?.[role.id] || role.id}
                                            </option>
                                        ))}
                                    </select>
                                    {selectedRole === 'custom' && (
                                        <Input
                                            placeholder={dict.Users.Dialog.RolePlaceholder}
                                            value={customRoleName}
                                            onChange={(e) => setCustomRoleName(e.target.value)}
                                            required
                                            className="flex-1 rounded-lg border-blue-200 focus:ring-blue-500"
                                        />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.Phone}</Label>
                                <Input name="phone" defaultValue={user.phone || ''} placeholder={dict.Users.Dialog.Placeholders.Phone} className="rounded-lg border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700">{dict.Users.Dialog.Address}</Label>
                                <Input name="address" defaultValue={user.address || ''} placeholder={dict.Users.Dialog.Placeholders.Address} className="rounded-lg border-slate-200" />
                            </div>
                        </div>

                        {/* Permissions Matrix */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-inner">
                            <div className="flex items-center justify-between mb-4">
                                <Label className="font-black text-slate-900 block text-base flex items-center gap-3">
                                    <Shield size={20} className="text-blue-600" />
                                    {dict.Users.Dialog.Permissions}
                                </Label>
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full">
                                    {permissions.length} / {ALL_PERMISSIONS.length}
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {ALL_PERMISSIONS.map(permission => (
                                    <div
                                        key={permission.id}
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer group ${permissions.includes(permission.id)
                                            ? 'bg-white border-blue-200 shadow-sm'
                                            : 'bg-slate-100/50 border-slate-200/50 hover:bg-white hover:border-slate-300'
                                            }`}
                                        onClick={() => togglePermission(permission.id)}
                                    >
                                        <div className={`h-5 w-5 rounded-md flex items-center justify-center transition-colors ${permissions.includes(permission.id) ? 'bg-blue-600' : 'bg-white border-2 border-slate-300'
                                            }`}>
                                            {permissions.includes(permission.id) && <CheckCircle2 size={14} className="text-white" />}
                                        </div>
                                        <span className={`text-xs font-bold transition-colors ${permissions.includes(permission.id) ? 'text-blue-700' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                            {dict.Users.PermissionsList?.[permission.id] || permission.id}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} className="font-bold text-slate-500 hover:bg-slate-100">
                                {dict.Users.Dialog.Cancel}
                            </Button>
                            <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 h-11 px-10 font-black rounded-xl text-white shadow-lg shadow-blue-100">
                                {loading ? <Loader2 className="animate-spin" /> : dict.Users.Dialog.Save}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Re-using constants from AddUserDialog (In a real app, these would be exported from a shared file)
const ALL_PERMISSIONS = [
    { id: 'pos' },
    { id: 'sales' },
    { id: 'returns' },
    { id: 'customers' },
    { id: 'suppliers' },
    { id: 'inventory' },
    { id: 'accounting' },
    { id: 'expenses' },
    { id: 'reports' },
    { id: 'employees' },
    { id: 'settings' },
    { id: 'users' }
];

const DEFAULT_ROLES = [
    { id: 'admin' },
    { id: 'manager' },
    { id: 'accountant' },
    { id: 'cashier' },
    { id: 'salesperson' },
    { id: 'storekeeper' },
    { id: 'custom' }
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
    admin: ALL_PERMISSIONS.map(p => p.id),
    manager: ['pos', 'sales', 'returns', 'customers', 'suppliers', 'inventory', 'expenses', 'reports', 'employees'],
    accountant: ['sales', 'returns', 'customers', 'suppliers', 'inventory', 'accounting', 'expenses', 'reports'],
    cashier: ['pos', 'sales', 'customers'],
    salesperson: ['sales', 'customers', 'reports'],
    storekeeper: ['inventory', 'suppliers'],
    custom: []
};
