"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import { ChevronLeft } from "lucide-react";
import { REASON_LABELS, STATUS_LABELS } from "@/lib/constants";
import {
  approveAppointmentAction,
  rejectAppointmentAction,
  rescheduleAppointmentAction,
} from "@/lib/actions/teacher";
import { AppointmentScheduleCalendar, type ScheduleAppointment } from "@/components/calendar/AppointmentScheduleCalendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type OpenSlot = {
  id: string;
  date: Date | string;
  startTime: string;
  booked: number;
  maxBookings: number;
};

function RescheduleDialog({
  appointmentId,
  openSlots,
  pending,
  onClose,
  onReschedule,
}: {
  appointmentId: string | null;
  openSlots: OpenSlot[];
  pending: boolean;
  onClose: () => void;
  onReschedule: (slotId: string) => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId) setSelectedDate(null);
  }, [appointmentId]);

  const availableSlots = useMemo(
    () => openSlots.filter((s) => s.booked < s.maxBookings),
    [openSlots]
  );

  const slotsByDate = useMemo(() => {
    const map = new Map<string, OpenSlot[]>();
    for (const slot of availableSlots) {
      const key = format(new Date(slot.date), "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(slot);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [availableSlots]);

  const availableDates = useMemo(
    () => Array.from(slotsByDate.keys()).sort(),
    [slotsByDate]
  );

  const slotsForDate = selectedDate ? (slotsByDate.get(selectedDate) ?? []) : [];

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setSelectedDate(null);
      onClose();
    }
  };

  return (
    <Dialog open={!!appointmentId} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Jadualkan Semula</DialogTitle>
        </DialogHeader>

        {availableDates.length === 0 ? (
          <p className="text-sm text-slate-500">Tiada slot tersedia untuk dijadualkan semula.</p>
        ) : !selectedDate ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">Pilih tarikh dahulu.</p>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {availableDates.map((dateKey) => {
                const count = slotsByDate.get(dateKey)?.length ?? 0;
                const date = new Date(`${dateKey}T12:00:00`);
                return (
                  <Button
                    key={dateKey}
                    variant="outline"
                    className="w-full justify-between"
                    disabled={pending}
                    onClick={() => setSelectedDate(dateKey)}
                  >
                    <span className="font-medium capitalize">
                      {format(date, "EEEE, d MMMM yyyy", { locale: ms })}
                    </span>
                    <span className="text-xs text-slate-500">{count} slot</span>
                  </Button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="flex items-center gap-1 text-sm text-teal-700 hover:text-teal-800"
            >
              <ChevronLeft className="h-4 w-4" />
              Kembali ke tarikh
            </button>
            <p className="text-sm text-slate-500">
              Slot tersedia pada{" "}
              <span className="font-medium text-slate-700">
                {format(new Date(`${selectedDate}T12:00:00`), "d MMMM yyyy", { locale: ms })}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {slotsForDate.map((slot) => (
                <Button
                  key={slot.id}
                  variant="outline"
                  className="w-full"
                  disabled={pending}
                  onClick={() => onReschedule(slot.id)}
                >
                  {slot.startTime}
                </Button>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function TeacherAppointmentsClient({
  appointments,
  openSlots,
}: {
  appointments: ScheduleAppointment[];
  openSlots: OpenSlot[];
}) {
  const [selected, setSelected] = useState<ScheduleAppointment | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const statusColor = (status: string) => {
    if (status === "APPROVED") return "bg-emerald-100 text-emerald-800 border-emerald-200";
    if (status === "PENDING") return "bg-amber-100 text-amber-800 border-amber-200";
    if (status === "REJECTED") return "bg-red-100 text-red-800 border-red-200";
    return "bg-slate-100 text-slate-600";
  };

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else {
        setSelected(null);
        setRescheduleId(null);
        window.location.reload();
      }
    });
  };

  const detailDialog = (
    <>
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle>{selected.student.name}</DialogTitle>
              </DialogHeader>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Rujukan</dt>
                  <dd className="font-mono">{selected.referenceNo}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Kelas</dt>
                  <dd>
                    {selected.student.class.yearLevel.labelBm} {selected.student.class.name}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tarikh & Masa</dt>
                  <dd>
                    {format(new Date(selected.slot.date), "dd MMM yyyy")} {selected.slot.startTime}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Ibu/Bapa</dt>
                  <dd>
                    {selected.parentName} · {selected.parentPhone}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sebab</dt>
                  <dd>{REASON_LABELS[selected.reason]}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd>{STATUS_LABELS[selected.status]}</dd>
                </div>
              </dl>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex flex-wrap gap-2 pt-2">
                {selected.status === "PENDING" && (
                  <>
                    <Button disabled={pending} onClick={() => run(() => approveAppointmentAction(selected.id))}>
                      Luluskan
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => rejectAppointmentAction(selected.id))}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => {
                    setError(null);
                    setRescheduleId(selected.id);
                  }}
                >
                  Jadualkan Semula
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RescheduleDialog
        appointmentId={rescheduleId}
        openSlots={openSlots}
        pending={pending}
        onClose={() => setRescheduleId(null)}
        onReschedule={(slotId) => run(() => rescheduleAppointmentAction(rescheduleId!, slotId))}
      />
    </>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Kalendar</TabsTrigger>
          <TabsTrigger value="list">Senarai</TabsTrigger>
        </TabsList>

        <TabsContent value="calendar">
          <AppointmentScheduleCalendar
            appointments={appointments}
            onSelectAppointment={setSelected}
          />
        </TabsContent>

        <TabsContent value="list">
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {appointments.map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => setSelected(appt)}
                  className={cn(
                    "rounded-xl border p-4 text-left transition-shadow hover:shadow-md",
                    statusColor(appt.status)
                  )}
                >
                  <p className="font-medium">{appt.student.name}</p>
                  <p className="text-xs opacity-80">
                    {format(new Date(appt.slot.date), "dd MMM")} · {appt.slot.startTime}
                  </p>
                  <p className="mt-1 text-xs">{REASON_LABELS[appt.reason]}</p>
                </button>
              ))}
              {appointments.length === 0 && (
                <p className="col-span-full text-sm text-slate-500">Tiada temujanji</p>
              )}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Semua Temujanji</CardTitle>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-slate-500">
                      <th className="pb-2 pr-4">Murid</th>
                      <th className="pb-2 pr-4">Kelas</th>
                      <th className="pb-2 pr-4">Tarikh</th>
                      <th className="pb-2 pr-4">Sebab</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((appt) => (
                      <tr
                        key={appt.id}
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50"
                        onClick={() => setSelected(appt)}
                      >
                        <td className="py-2 pr-4">{appt.student.name}</td>
                        <td className="py-2 pr-4">
                          {appt.student.class.yearLevel.labelBm} {appt.student.class.name}
                        </td>
                        <td className="py-2 pr-4">
                          {format(new Date(appt.slot.date), "dd/MM/yyyy")} {appt.slot.startTime}
                        </td>
                        <td className="py-2 pr-4">{REASON_LABELS[appt.reason]}</td>
                        <td className="py-2">
                          <Badge variant="outline">{STATUS_LABELS[appt.status]}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {detailDialog}
    </div>
  );
}
