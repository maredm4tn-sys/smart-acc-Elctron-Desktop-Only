"use client"

import * as React from "react"
import { format } from "date-fns"
import { arEG, enUS } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useTranslation } from "@/components/providers/i18n-provider"

interface DateRangePickerProps {
    className?: string
    date?: DateRange
    onSelect?: (date: DateRange | undefined) => void
}

export function DateRangePicker({
    className,
    date,
    onSelect,
}: DateRangePickerProps) {
    const { dict, lang, dir } = useTranslation();
    const dateLocale = lang === 'ar' ? arEG : enUS;

    return (
        <div className={cn("grid gap-2", className)}>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[300px] justify-start text-left font-normal",
                            !date && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className={`${dir === 'rtl' ? 'ml-2' : 'mr-2'} h-4 w-4`} />
                        {date?.from ? (
                            date.to ? (
                                <span className="text-xs md:text-sm">
                                    {dict.Common.From} {format(date.from, "yyyy-MM-dd")} {dict.Common.To} {format(date.to, "yyyy-MM-dd")}
                                </span>
                            ) : (
                                format(date.from, "yyyy-MM-dd")
                            )
                        ) : (
                            <span>{dict.Common.DateRange}</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={date?.from}
                        selected={date}
                        onSelect={onSelect}
                        numberOfMonths={2}
                        locale={dateLocale}
                        dir={dir}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
