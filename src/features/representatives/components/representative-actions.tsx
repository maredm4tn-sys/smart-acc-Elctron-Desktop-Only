"use client";

import { useState, useTransition } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Pencil, Trash, FileBarChart } from "lucide-react";
import Link from "next/link";
import { deleteRepresentative } from "../actions";
import { toast } from "sonner";
import { AddRepresentativeDialog } from "./add-representative-dialog"; // Reuse the dialog we just created

interface Props {
    representative: any; // We can type this strictly if we export type from schema or actions
    dict: any;
}

export function RepresentativeActions({ representative, dict }: Props) {
    const [isPending, startTransition] = useTransition();
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = () => {
        if (confirm(dict.Common?.DeleteConfirm)) {
            startTransition(async () => {
                const res = await deleteRepresentative(representative.id);
                if (res.success) toast.success(dict.Common?.DeleteSuccess);
                else toast.error(res.message || dict.Common?.DeleteError);
            });
        }
    };

    return (
        <div className="flex items-center justify-end gap-1">
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-primary hover:bg-slate-100"
                title={dict.Representatives?.Table?.Edit}
                onClick={() => setEditOpen(true)}
            >
                <Pencil size={18} />
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                asChild
            >
                <Link
                    href={`/dashboard/representatives/${representative.id}`}
                    title={dict.Representatives?.Table?.ViewReport}
                    aria-label={dict.Representatives?.Table?.ViewReport}
                >
                    <FileBarChart size={18} />
                </Link>
            </Button>

            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-rose-500 hover:text-rose-600 hover:bg-rose-50"
                title={dict.Representatives?.Table?.Delete}
                onClick={handleDelete}
            >
                <Trash size={18} />
            </Button>

            <AddRepresentativeDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                editMode={true}
                initialData={representative}
            />
        </div>
    );
}
