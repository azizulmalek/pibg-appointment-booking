"use client";

import { useState, useTransition } from "react";
import {
  importStudentsAdminAction,
  createSessionAction,
  setActiveSessionAction,
} from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Teacher = { id: string; user: { name: string } };
type Session = { id: string; label: string; isActive: boolean; startDate: Date; endDate: Date };
type Student = {
  studentNo: string;
  name: string;
  class: { name: string; yearLevel: { labelBm: string }; teacher: { user: { name: string } } };
};

export function AdminStudentsClient({
  teachers,
  sessions,
  students,
}: {
  teachers: Teacher[];
  sessions: Session[];
  students: Student[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Sesi Akademik</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-500">
            Sesi baharu diaktifkan secara automatik pada awal setiap tahun kalendar. Data sesi lama kekal sebagai arkib.
          </p>
          <ul className="space-y-2 text-sm">
            {sessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span>
                  {s.label} {s.isActive && <span className="text-teal-600">(aktif)</span>}
                </span>
                {!s.isActive && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await setActiveSessionAction(s.id);
                        window.location.reload();
                      })
                    }
                  >
                    Aktifkan
                  </Button>
                )}
              </li>
            ))}
          </ul>
          <form
            className="grid gap-3 border-t pt-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const result = await createSessionAction(new FormData(e.currentTarget));
                if (result.error) setError(result.error);
                else window.location.reload();
              });
            }}
          >
            <div className="space-y-1">
              <Label>Label (cth. 2026/2027)</Label>
              <Input name="label" required />
            </div>
            <div className="space-y-1">
              <Label>Mula</Label>
              <Input type="date" name="startDate" required />
            </div>
            <div className="space-y-1">
              <Label>Tamat</Label>
              <Input type="date" name="endDate" required />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="setActive" />
              Jadikan sesi aktif
            </label>
            <Button type="submit" disabled={pending}>
              Tambah Sesi
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Murid (Excel)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await importStudentsAdminAction(new FormData(e.currentTarget));
                if (result.error) setError(result.error);
                else setMessage(`${result.imported ?? 0} murid diimport.`);
              });
            }}
          >
            <div className="space-y-2">
              <Label>Guru</Label>
              <select name="teacherId" className="h-10 w-full rounded-xl border px-3 text-sm" required>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.user.name}
                  </option>
                ))}
              </select>
            </div>
            <Input type="file" name="file" accept=".xlsx,.xls,.csv" required />
            <Button type="submit" disabled={pending}>
              Muat Naik
            </Button>
          </form>
        </CardContent>
      </Card>

      {(error || message) && (
        <p className={`text-sm ${error ? "text-red-600" : "text-emerald-600"}`}>{error ?? message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Semua Murid (sesi aktif)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-4">No. Murid</th>
                <th className="pb-2 pr-4">Nama</th>
                <th className="pb-2 pr-4">Kelas</th>
                <th className="pb-2">Guru</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.studentNo} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{s.studentNo}</td>
                  <td className="py-2 pr-4">{s.name}</td>
                  <td className="py-2 pr-4">
                    {s.class.yearLevel.labelBm} {s.class.name}
                  </td>
                  <td className="py-2">{s.class.teacher.user.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
