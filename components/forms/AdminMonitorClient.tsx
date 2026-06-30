"use client";

import { format } from "date-fns";
import { exportAppointmentsCsv } from "@/lib/actions/admin";
import { REASON_LABELS, STATUS_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonitorData = Awaited<ReturnType<typeof import("@/lib/actions/admin").getMonitorData>>;

export function AdminMonitorClient({ data }: { data: MonitorData }) {
  const downloadCsv = async () => {
    const csv = await exportAppointmentsCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `temujanji-${data.session?.label ?? "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <Button onClick={downloadCsv}>Eksport CSV</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Temujanji ({data.appointments.length})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-3">Rujukan</th>
                <th className="pb-2 pr-3">Murid</th>
                <th className="pb-2 pr-3">Guru</th>
                <th className="pb-2 pr-3">Tarikh</th>
                <th className="pb-2 pr-3">Sebab</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.appointments.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 font-mono text-xs">{a.referenceNo}</td>
                  <td className="py-2 pr-3">{a.student.name}</td>
                  <td className="py-2 pr-3">{a.slot.teacher.user.name}</td>
                  <td className="py-2 pr-3">
                    {format(a.slot.date, "dd/MM/yyyy")} {a.slot.startTime}
                  </td>
                  <td className="py-2 pr-3">{REASON_LABELS[a.reason]}</td>
                  <td className="py-2">{STATUS_LABELS[a.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Kelas</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {data.classes.map((c) => (
              <li key={c.id} className="flex justify-between border-b py-2">
                <span>
                  {c.yearLevel.labelBm} {c.name} — {c.teacher.user.name}
                </span>
                <span className="text-slate-400">{c._count.students} murid</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
