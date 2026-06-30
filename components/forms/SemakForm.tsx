"use client";

import { useState, useTransition } from "react";
import { BirthCertInput } from "./BirthCertInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { REASON_LABELS, STATUS_LABELS } from "@/lib/constants";
import { lookupParentAppointments } from "@/lib/actions/parent";
import { cancelAppointmentAction } from "@/lib/actions/booking";
import { format } from "date-fns";

export function SemakForm() {
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof lookupParentAppointments>> | null>(null);
  const [pending, startTransition] = useTransition();

  if (data && "student" in data && data.student) {
    const { student, appointments } = data;
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-slate-500">Murid</p>
            <p className="font-semibold">{student.name}</p>
            <p className="text-sm text-slate-500">
              {student.class.yearLevel.labelBm} {student.class.name}
            </p>
          </CardContent>
        </Card>
        {appointments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-slate-500">
              Tiada tempahan aktif untuk sesi semasa.
            </CardContent>
          </Card>
        ) : (
          appointments.map((appt) => (
            <Card key={appt.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-teal-700">{appt.referenceNo}</span>
                  <Badge
                    variant={
                      appt.status === "APPROVED"
                        ? "default"
                        : appt.status === "PENDING"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {STATUS_LABELS[appt.status]}
                  </Badge>
                </div>
                <dl className="grid gap-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Tarikh</dt>
                    <dd>{format(appt.slot.date, "dd MMM yyyy")}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Masa</dt>
                    <dd>{appt.slot.startTime}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Guru</dt>
                    <dd>{appt.slot.teacher.user.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Sebab</dt>
                    <dd>{REASON_LABELS[appt.reason]}</dd>
                  </div>
                </dl>
                {appt.status === "PENDING" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      startTransition(async () => {
                        await cancelAppointmentAction(appt.id);
                        setData(null);
                      });
                    }}
                  >
                    Batalkan Tempahan
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
        <Button variant="ghost" className="w-full" onClick={() => setData(null)}>
          Semak Lain
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await lookupParentAppointments(String(fd.get("birthCert")));
              if ("error" in result && result.error) {
                setError(result.error);
                return;
              }
              setData(result);
            });
          }}
          className="space-y-6"
        >
          <BirthCertInput />
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Memproses..." : "Semak"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
