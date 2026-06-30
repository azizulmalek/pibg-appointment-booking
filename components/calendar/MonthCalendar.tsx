"use client";

import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type DayStatus = "grey" | "red" | "green";

type MonthCalendarProps = {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  selectedDate?: Date;
  onSelectDate: (date: Date) => void;
  getDayStatus: (date: Date) => DayStatus;
};

const statusStyles: Record<DayStatus, string> = {
  grey: "bg-slate-100 text-slate-400",
  red: "bg-red-50 text-red-600 border border-red-100",
  green: "bg-emerald-50 text-emerald-700 border border-emerald-100",
};

const statusLabels: Record<DayStatus, string> = {
  grey: "Tutup",
  red: "Penuh",
  green: "Tersedia",
};

export function MonthCalendar({
  currentMonth,
  onMonthChange,
  selectedDate,
  onSelectDate,
  getDayStatus,
}: MonthCalendarProps) {
  const days = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const startPad = getDay(startOfMonth(currentMonth));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between">
        <Button type="button" variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentMonth, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h3 className="text-sm font-semibold">{format(currentMonth, "MMMM yyyy")}</h3>
        <Button type="button" variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentMonth, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {["Is", "Se", "Ra", "Kh", "Ju", "Sa", "Ah"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startPad === 0 ? 6 : startPad - 1 }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const status = getDayStatus(day);
          const isWeekend = getDay(day) === 0 || getDay(day) === 6;
          const disabled = isWeekend || status === "grey";
          const selected = selectedDate && isSameDay(day, selectedDate);

          return (
            <button
              key={day.toISOString()}
              type="button"
              disabled={disabled}
              onClick={() => onSelectDate(day)}
              title={statusLabels[status]}
              className={cn(
                "flex h-10 flex-col items-center justify-center rounded-lg text-sm transition-all",
                !isSameMonth(day, currentMonth) && "opacity-40",
                statusStyles[status],
                selected && "ring-2 ring-teal-600 ring-offset-1",
                disabled && "cursor-not-allowed opacity-60"
              )}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-500">
        {(["green", "red", "grey"] as DayStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-full", statusStyles[s])} />
            {statusLabels[s]}
          </span>
        ))}
      </div>
    </div>
  );
}

export function useCalendarMonth(initial = new Date()) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(initial));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  return { currentMonth, setCurrentMonth, selectedDate, setSelectedDate };
}
