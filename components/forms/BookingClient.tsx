"use client";

import { useMemo, useState, useTransition } from "react";
import { format, startOfMonth } from "date-fns";
import { CheckCircle2 } from "lucide-react";
import { MonthCalendar, useCalendarMonth } from "@/components/calendar/MonthCalendar";
import { SlotGrid } from "@/components/calendar/SlotGrid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { REASON_LABELS } from "@/lib/constants";
import { bookAppointmentAction } from "@/lib/actions/booking";
import { getDaySlotsAction } from "@/lib/actions/booking";
import type { AppointmentReason } from "@prisma/client";

type StudentContext = {
  id: string;
  name: string;
  class: {
    name: string;
    yearLevel: { labelBm: string };
    teacher: { user: { name: string } };
  };
};

type CalendarData = {
  slots: Array<{
    date: string;
    isOpen: boolean;
    booked: number;
    maxBookings: number;
  }>;
  blackouts: Array<{ startDate: Date; endDate: Date; title: string }>;
};

const REASONS: AppointmentReason[] = ["GENERAL", "MIDTERM", "FINAL"];

export function BookingClient({
  student,
  initialCalendar,
}: {
  student: StudentContext;
  initialCalendar: CalendarData | null;
}) {
  const { currentMonth, setCurrentMonth, selectedDate, setSelectedDate } = useCalendarMonth();
  const [reason, setReason] = useState<AppointmentReason>("GENERAL");
  const [daySlots, setDaySlots] = useState<Awaited<ReturnType<typeof getDaySlotsAction>>>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string>();
  const [selectedTime, setSelectedTime] = useState<string>();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const getDayStatus = useMemo(() => {
    return (date: Date) => {
      const key = format(date, "yyyy-MM-dd");
      const blackout = initialCalendar?.blackouts.some(
        (b) => date >= new Date(b.startDate) && date <= new Date(b.endDate)
      );
      if (blackout) return "grey" as const;

      const daySlotsData = initialCalendar?.slots.filter(
        (s) => format(new Date(s.date), "yyyy-MM-dd") === key
      );
      if (!daySlotsData?.length) return "grey" as const;
      const open = daySlotsData.filter((s) => s.isOpen);
      if (!open.length) return "grey" as const;
      const hasAvailable = open.some((s) => s.booked < s.maxBookings);
      return hasAvailable ? ("green" as const) : ("red" as const);
    };
  }, [initialCalendar]);

  const loadDaySlots = (date: Date) => {
    setSelectedDate(date);
    setSelectedSlotId(undefined);
    startTransition(async () => {
      const data = await getDaySlotsAction(format(date, "yyyy-MM-dd"));
      setDaySlots(data);
    });
  };

  if (success) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">Tempahan Berjaya!</h2>
        <p className="mt-2 text-sm text-slate-500">Simpan nombor rujukan ini</p>
        <p className="mt-4 rounded-2xl bg-teal-50 px-6 py-4 text-2xl font-bold tracking-wide text-teal-800">
          {success}
        </p>
        <Button className="mt-8" variant="outline" onClick={() => (window.location.href = "/semak")}>
          Semak Tempahan
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          <dl className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Nama</dt>
              <dd className="font-medium">{student.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Tahun / Kelas</dt>
              <dd className="font-medium">
                {student.class.yearLevel.labelBm} {student.class.name}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Guru</dt>
              <dd className="font-medium">{student.class.teacher.user.name}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div>
        <p className="mb-3 text-sm font-medium text-slate-700">Sebab temujanji</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setReason(r)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                reason === r
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              }`}
            >
              {REASON_LABELS[r]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <MonthCalendar
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          selectedDate={selectedDate}
          onSelectDate={loadDaySlots}
          getDayStatus={getDayStatus}
        />
        {selectedDate ? (
          daySlots?.blackout?.blocked ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-slate-500">
                Tempahan ditutup: {daySlots.blackout.title}
              </CardContent>
            </Card>
          ) : (
            <SlotGrid
              slots={daySlots?.slots ?? []}
              selectedSlotId={selectedSlotId}
              onSelect={(id, time) => {
                setSelectedSlotId(id);
                setSelectedTime(time);
                setDialogOpen(true);
              }}
            />
          )
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Pilih tarikh pada kalendar
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sahkan Tempahan</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const fd = new FormData(e.currentTarget);
              fd.set("slotId", selectedSlotId!);
              fd.set("reason", reason);
              startTransition(async () => {
                const result = await bookAppointmentAction(fd);
                if (result.error) {
                  setError(result.error);
                  return;
                }
                if (result.success && result.referenceNo) {
                  setDialogOpen(false);
                  setSuccess(result.referenceNo);
                }
              });
            }}
            className="space-y-4"
          >
            <div className="rounded-xl bg-slate-50 p-4 text-sm">
              <p>
                <strong>{student.name}</strong>
              </p>
              <p className="text-slate-500">
                {selectedDate && format(selectedDate, "dd MMM yyyy")} · {selectedTime} ·{" "}
                {REASON_LABELS[reason]}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentName">Nama Ibu/Bapa</Label>
              <Input id="parentName" name="parentName" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="parentPhone">No. Telefon</Label>
              <Input id="parentPhone" name="parentPhone" type="tel" required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Menempah..." : "Sahkan Tempahan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
