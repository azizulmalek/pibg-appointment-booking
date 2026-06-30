"use client";

import { useState, useTransition } from "react";
import { format, addDays } from "date-fns";
import { SLOT_TIMES } from "@/lib/constants";
import { toggleSlotAction } from "@/lib/actions/teacher";
import { BulkSlotSection } from "@/components/forms/BulkSlotSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SlotRow = {
  id: string;
  startTime: string;
  isOpen: boolean;
  booked: number;
  maxBookings: number;
};

export function TeacherSlotsClient({
  initialDate,
  initialSlots,
}: {
  initialDate: string;
  initialSlots: SlotRow[];
}) {
  const [dateStr, setDateStr] = useState(initialDate);
  const [slots, setSlots] = useState(initialSlots);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadDate = (d: string) => {
    setDateStr(d);
    startTransition(async () => {
      const res = await fetch(`/api/teacher/slots?date=${d}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    });
  };

  const toggle = (startTime: string, isOpen: boolean) => {
    startTransition(async () => {
      const result = await toggleSlotAction(dateStr, startTime, isOpen);
      if (result.error) setError(result.error);
      else loadDate(dateStr);
    });
  };

  const date = new Date(dateStr);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Pilih Tarikh</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => loadDate(e.target.value)}
            className="w-auto"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadDate(format(addDays(date, -1), "yyyy-MM-dd"))}
          >
            ←
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadDate(format(addDays(date, 1), "yyyy-MM-dd"))}
          >
            →
          </Button>
          {isWeekend && <span className="text-sm text-amber-600">Hujung minggu</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Slot {format(date, "dd MMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {SLOT_TIMES.map((time) => {
              const slot = slots.find((s) => s.startTime === time);
              const isOpen = slot?.isOpen ?? false;
              const full = slot ? slot.booked >= slot.maxBookings : false;
              return (
                <button
                  key={time}
                  type="button"
                  disabled={pending || isWeekend}
                  onClick={() => toggle(time, !isOpen)}
                  className={cn(
                    "rounded-xl border px-3 py-3 text-sm font-medium transition-all",
                    isOpen
                      ? full
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  {time}
                  <span className="mt-0.5 block text-[10px] font-normal">
                    {isOpen ? (full ? "Penuh" : "Buka") : "Tutup"}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <BulkSlotSection
        onSuccess={(msg) => {
          setError(null);
          setMessage(msg);
          loadDate(dateStr);
        }}
        onError={(msg) => {
          setMessage(null);
          setError(msg);
        }}
      />

      {(error || message) && (
        <p className={`text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>{error ?? message}</p>
      )}
    </div>
  );
}
