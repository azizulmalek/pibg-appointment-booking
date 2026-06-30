"use client";

import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  getDay,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import { ms } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SLOT_TIMES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ScheduleAppointment = {
  id: string;
  referenceNo: string;
  status: string;
  reason: string;
  parentName: string;
  parentPhone: string;
  slot: { id: string; date: Date | string; startTime: string };
  student: {
    name: string;
    studentNo: string;
    class: { name: string; yearLevel: { labelBm: string } };
  };
};

type ViewMode = "month" | "week" | "day";

const WEEKDAY_LABELS = ["Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu", "Ahad"];
const WEEKDAY_SHORT = ["Is", "Se", "Ra", "Kh", "Ju", "Sa", "Ah"];

const WEEK_GRID_STYLE = {
  display: "grid",
  gridTemplateColumns: "4.5rem repeat(7, minmax(0, 1fr))",
} as const;

function statusStyles(status: string) {
  if (status === "APPROVED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (status === "PENDING") return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function slotDateKey(date: Date | string, startTime: string) {
  return `${format(new Date(date), "yyyy-MM-dd")}|${startTime}`;
}

function apptDate(appt: ScheduleAppointment) {
  return startOfDay(new Date(appt.slot.date));
}

function weekdayIndex(day: Date) {
  return getDay(day) === 0 ? 6 : getDay(day) - 1;
}

export function AppointmentScheduleCalendar({
  appointments,
  onSelectAppointment,
}: {
  appointments: ScheduleAppointment[];
  onSelectAppointment: (appt: ScheduleAppointment) => void;
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));

  const apptBySlot = useMemo(() => {
    const map = new Map<string, ScheduleAppointment>();
    appointments.forEach((a) => {
      map.set(slotDateKey(a.slot.date, a.slot.startTime), a);
    });
    return map;
  }, [appointments]);

  const apptsByDay = useMemo(() => {
    const map = new Map<string, ScheduleAppointment[]>();
    appointments.forEach((a) => {
      const key = format(apptDate(a), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(a);
      map.set(key, list.sort((x, y) => x.slot.startTime.localeCompare(y.slot.startTime)));
    });
    return map;
  }, [appointments]);

  const weekStart = startOfWeek(cursor, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(cursor, { weekStartsOn: 1 }),
  });

  const monthDays = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const gridStart = startOfWeek(start, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(end, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const navigate = (dir: -1 | 1) => {
    if (view === "month") setCursor(dir === 1 ? addMonths(cursor, 1) : subMonths(cursor, 1));
    else if (view === "week") setCursor(dir === 1 ? addWeeks(cursor, 1) : subWeeks(cursor, 1));
    else setCursor(dir === 1 ? addDays(cursor, 1) : addDays(cursor, -1));
  };

  const headerLabel = () => {
    if (view === "month") return format(cursor, "MMMM yyyy", { locale: ms });
    if (view === "week") {
      const end = endOfWeek(cursor, { weekStartsOn: 1 });
      return `${format(weekStart, "d MMM", { locale: ms })} – ${format(end, "d MMM yyyy", { locale: ms })}`;
    }
    return format(cursor, "EEEE, d MMMM yyyy", { locale: ms });
  };

  const goToday = () => {
    const today = startOfDay(new Date());
    setCursor(today);
    setSelectedDay(today);
  };

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (!isSameMonth(day, cursor)) {
      setCursor(startOfMonth(day));
    }
  };

  const renderApptChip = (appt: ScheduleAppointment, compact = false) => (
    <button
      key={appt.id}
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSelectAppointment(appt);
      }}
      className={cn(
        "w-full rounded-md border px-1.5 text-left transition-shadow hover:shadow-sm",
        statusStyles(appt.status),
        compact ? "py-0.5 text-[10px] leading-tight" : "py-1.5 text-xs"
      )}
    >
      <span className="block truncate font-medium">{appt.student.name}</span>
      {!compact && (
        <span className="mt-0.5 block opacity-80">
          {appt.slot.startTime} · {appt.student.class.yearLevel.labelBm} {appt.student.class.name}
        </span>
      )}
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-col gap-4 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="month">Bulanan</TabsTrigger>
            <TabsTrigger value="week">Mingguan</TabsTrigger>
            <TabsTrigger value="day">Harian</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[180px] text-center text-sm font-semibold capitalize">{headerLabel()}</span>
          <Button type="button" variant="ghost" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Hari Ini
          </Button>
        </div>
      </div>

      <div className="p-4">
        {view === "month" && (
          <div className="space-y-6">
            <div>
              <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
                {WEEKDAY_SHORT.map((d) => (
                  <div key={d} className="py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div
                className="grid grid-cols-7 gap-2"
                style={{ gridAutoRows: "minmax(5.5rem, auto)" }}
              >
                {monthDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayAppts = apptsByDay.get(key) ?? [];
                  const selected = isSameDay(day, selectedDay);
                  const isToday = isSameDay(day, new Date());
                  const inCurrentMonth = isSameMonth(day, cursor);

                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      onClick={() => selectDay(day)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          selectDay(day);
                        }
                      }}
                      className={cn(
                        "h-full min-h-[5.5rem] cursor-pointer rounded-xl border p-2 text-left transition-colors",
                        selected && inCurrentMonth && "border-teal-500 bg-teal-50 ring-1 ring-teal-500",
                        !selected && inCurrentMonth && "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                        !inCurrentMonth && "border-slate-100 bg-slate-50 text-slate-400"
                      )}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={cn(
                            "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                            isToday && "bg-teal-700 text-white",
                            !isToday && inCurrentMonth && "text-slate-800",
                            !inCurrentMonth && "text-slate-400"
                          )}
                        >
                          {format(day, "d")}
                        </span>
                      </div>
                      {inCurrentMonth && (
                        <div className="mt-1 space-y-0.5 overflow-hidden">
                          {dayAppts.slice(0, 2).map((a) => renderApptChip(a, true))}
                          {dayAppts.length > 2 && (
                            <p className="px-0.5 text-[10px] text-slate-500">+{dayAppts.length - 2} lagi</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
              <h4 className="mb-3 text-sm font-semibold">
                {format(selectedDay, "EEEE, d MMMM yyyy", { locale: ms })}
              </h4>
              <div className="space-y-2">
                {(apptsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []).length === 0 ? (
                  <p className="text-sm text-slate-500">Tiada temujanji</p>
                ) : (
                  (apptsByDay.get(format(selectedDay, "yyyy-MM-dd")) ?? []).map((a) => renderApptChip(a))
                )}
              </div>
            </div>
          </div>
        )}

        {view === "week" && (
          <div className="overflow-x-auto">
            <div className="w-full min-w-[640px]">
              <div style={WEEK_GRID_STYLE} className="border-b border-slate-200">
                <div className="p-2" />
                {weekDays.map((day) => (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "border-l border-slate-200 px-1 py-3 text-center sm:px-2",
                      isSameDay(day, new Date()) && "bg-teal-50"
                    )}
                  >
                    <div className="truncate text-xs font-medium text-slate-500">
                      {WEEKDAY_LABELS[weekdayIndex(day)]}
                    </div>
                    <div
                      className={cn(
                        "mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                        isSameDay(day, new Date()) ? "bg-teal-700 text-white" : "text-slate-800"
                      )}
                    >
                      {format(day, "d")}
                    </div>
                  </div>
                ))}
              </div>
              {SLOT_TIMES.map((time) => (
                <div key={time} style={WEEK_GRID_STYLE} className="border-b border-slate-100">
                  <div className="flex items-start p-2 text-xs font-medium text-slate-500">
                    {time}
                  </div>
                  {weekDays.map((day) => {
                    const appt = apptBySlot.get(slotDateKey(day, time));
                    return (
                      <div
                        key={`${format(day, "yyyy-MM-dd")}-${time}`}
                        className="min-h-[52px] border-l border-slate-100 p-1"
                      >
                        {appt && renderApptChip(appt, true)}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {view === "day" && (
          <div className="mx-auto max-w-lg">
            {SLOT_TIMES.map((time) => {
              const appt = apptBySlot.get(slotDateKey(cursor, time));
              return (
                <div
                  key={time}
                  className="flex gap-4 border-b border-slate-100 py-3 last:border-0"
                >
                  <div className="w-14 shrink-0 text-sm font-medium text-slate-500">{time}</div>
                  <div className="min-h-[40px] flex-1">
                    {appt ? (
                      renderApptChip(appt)
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-4 border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-emerald-200 bg-emerald-100" />
          Diluluskan
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-amber-200 bg-amber-100" />
          Menunggu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-red-200 bg-red-100" />
          Ditolak
        </span>
      </div>
    </div>
  );
}
