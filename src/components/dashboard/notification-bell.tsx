"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { getSmartAlerts } from "@/features/alerts/actions";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

export function NotificationBell() {
    const [count, setCount] = useState(0);
    const [hasNew, setHasNew] = useState(false);
    const router = useRouter();

    const fetchCount = async () => {
        const res = await getSmartAlerts();
        if (res.success && res.data) {
            const newCount = res.data.length;
            setCount(newCount);

            // "Seen" logic: Only show badge if current count > last seen count
            const lastSeen = localStorage.getItem("alerts_last_seen_count");
            if (newCount > 0 && (!lastSeen || newCount > parseInt(lastSeen))) {
                setHasNew(true);
            } else {
                setHasNew(false);
            }
        }
    };

    useEffect(() => {
        fetchCount();
        const interval = setInterval(fetchCount, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    const handleClick = () => {
        // Mark as seen
        localStorage.setItem("alerts_last_seen_count", count.toString());
        setHasNew(false);
        router.push("/dashboard/alerts");
    };

    return (
        <button
            onClick={handleClick}
            className="relative p-2 hover:bg-slate-50 rounded-full transition-colors group cursor-pointer border-none bg-transparent"
        >
            <Bell size={24} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
            {count > 0 && hasNew && (
                <span className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-white animate-in zoom-in pointer-events-none">
                    {count}
                </span>
            )}
        </button>
    );
}
