"use client";

import { useState, useTransition } from "react";
import { ChevronDown } from "lucide-react";
import { SLOT_TIMES } from "@/lib/constants";
import { bulkWeekdaySlotsAction, bulkMultiWeekdaySlotsAction } from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const WEEKDAYS = [
  { value: 1, label: "Isnin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Khamis" },
  { value: 5, label: "Jumaat" },
] as const;

function TimeSlotPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
  disabled?: boolean;
}) {
  const toggle = (time: string) => {
    const next = new Set(selected);
    if (next.has(time)) next.delete(time);
    else next.add(time);
    onChange(next);
  };

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {SLOT_TIMES.map((time) => {
        const active = selected.has(time);
        return (
          <button
            key={time}
            type="button"
            disabled={disabled}
            onClick={() => toggle(time)}
            className={cn(
              "rounded-lg border px-2 py-2 text-sm font-medium transition-all",
              active
                ? "border-teal-600 bg-teal-50 text-teal-800 ring-1 ring-teal-600/30"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {time}
          </button>
        );
      })}
    </div>
  );
}

function DateRangeFields({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
}: {
  startDate: string;
  endDate: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1">
        <Label>Tarikh Mula</Label>
        <Input type="date" value={startDate} onChange={(e) => onStartChange(e.target.value)} required />
      </div>
      <div className="space-y-1">
        <Label>Tarikh Tamat</Label>
        <Input type="date" value={endDate} onChange={(e) => onEndChange(e.target.value)} required />
      </div>
    </div>
  );
}

export function BulkSlotSection({
  onSuccess,
  onError,
}: {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  // Slot Harian state
  const [dailyStart, setDailyStart] = useState("");
  const [dailyEnd, setDailyEnd] = useState("");
  const [dailyWeekday, setDailyWeekday] = useState(1);
  const [dailyTimes, setDailyTimes] = useState<Set<string>>(new Set());

  // Slot Mingguan state
  const [weeklyStart, setWeeklyStart] = useState("");
  const [weeklyEnd, setWeeklyEnd] = useState("");
  const [activeWeekday, setActiveWeekday] = useState(1);
  const [weeklySchedule, setWeeklySchedule] = useState<Record<number, Set<string>>>(() =>
    Object.fromEntries(WEEKDAYS.map((d) => [d.value, new Set<string>()]))
  );

  const applyDaily = () => {
    onError("");
    startTransition(async () => {
      const result = await bulkWeekdaySlotsAction(
        dailyStart,
        dailyEnd,
        dailyWeekday,
        Array.from(dailyTimes)
      );
      if (result.error) onError(result.error);
      else onSuccess(`${result.count} slot dibuka untuk ${WEEKDAYS.find((w) => w.value === dailyWeekday)?.label}.`);
    });
  };

  const applyWeekly = () => {
    onError("");
    const schedule: Record<number, string[]> = {};
    for (const [wd, times] of Object.entries(weeklySchedule)) {
      const arr = Array.from(times);
      if (arr.length) schedule[Number(wd)] = arr;
    }
    startTransition(async () => {
      const result = await bulkMultiWeekdaySlotsAction(weeklyStart, weeklyEnd, schedule);
      if (result.error) onError(result.error);
      else onSuccess(`${result.count} slot dibuka mengikut jadual mingguan.`);
    });
  };

  const setWeeklyTimesForDay = (weekday: number, times: Set<string>) => {
    setWeeklySchedule((prev) => ({ ...prev, [weekday]: times }));
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h3 className="font-semibold text-slate-900">Bulk Slot</h3>
          <p className="text-sm text-slate-500">Buka slot secara pukal mengikut hari atau minggu</p>
        </div>
        <ChevronDown className={cn("h-5 w-5 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="space-y-8 border-t border-slate-100 px-5 pb-5 pt-4">
          {/* Slot Harian */}
          <section>
            <h4 className="mb-1 font-medium text-slate-900">Slot Harian</h4>
            <p className="mb-4 text-sm text-slate-500">
              Pilih hari dalam minggu dan beberapa slot masa. Slot akan dibuka untuk hari tersebut dari tarikh
              mula hingga tarikh tamat.
            </p>
            <div className="space-y-4">
              <DateRangeFields
                startDate={dailyStart}
                endDate={dailyEnd}
                onStartChange={setDailyStart}
                onEndChange={setDailyEnd}
              />
              <div className="space-y-2">
                <Label>Hari</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDailyWeekday(d.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                        dailyWeekday === d.value
                          ? "border-teal-600 bg-teal-50 text-teal-800"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Slot Masa (pilih banyak)</Label>
                <TimeSlotPicker selected={dailyTimes} onChange={setDailyTimes} disabled={pending} />
              </div>
              <Button
                type="button"
                disabled={pending || !dailyStart || !dailyEnd || dailyTimes.size === 0}
                onClick={applyDaily}
              >
                {pending ? "Memproses..." : "Guna"}
              </Button>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Slot Mingguan */}
          <section>
            <h4 className="mb-1 font-medium text-slate-900">Slot Mingguan</h4>
            <p className="mb-4 text-sm text-slate-500">
              Tetapkan slot berbeza untuk setiap hari. Pilih hari di kiri, pilih slot di kanan, kemudian guna
              untuk tempoh tarikh dipilih.
            </p>
            <div className="space-y-4">
              <DateRangeFields
                startDate={weeklyStart}
                endDate={weeklyEnd}
                onStartChange={setWeeklyStart}
                onEndChange={setWeeklyEnd}
              />
              <div className="grid gap-4 md:grid-cols-[140px_1fr]">
                <div className="space-y-1">
                  <Label>Hari</Label>
                  <div className="flex flex-col gap-1">
                    {WEEKDAYS.map((d) => {
                      const count = weeklySchedule[d.value]?.size ?? 0;
                      return (
                        <button
                          key={d.value}
                          type="button"
                          onClick={() => setActiveWeekday(d.value)}
                          className={cn(
                            "flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-all",
                            activeWeekday === d.value
                              ? "border-teal-600 bg-teal-50 text-teal-800"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          )}
                        >
                          {d.label}
                          {count > 0 && (
                            <span className="rounded-full bg-teal-700 px-1.5 py-0.5 text-[10px] text-white">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>
                    Slot Masa — {WEEKDAYS.find((w) => w.value === activeWeekday)?.label} (pilih banyak)
                  </Label>
                  <TimeSlotPicker
                    selected={weeklySchedule[activeWeekday] ?? new Set()}
                    onChange={(times) => setWeeklyTimesForDay(activeWeekday, times)}
                    disabled={pending}
                  />
                </div>
              </div>
              <Button
                type="button"
                disabled={
                  pending ||
                  !weeklyStart ||
                  !weeklyEnd ||
                  !Object.values(weeklySchedule).some((s) => s.size > 0)
                }
                onClick={applyWeekly}
              >
                {pending ? "Memproses..." : "Guna"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
