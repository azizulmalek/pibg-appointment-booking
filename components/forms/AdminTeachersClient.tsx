"use client";

import { useState, useTransition } from "react";
import { createTeacherAction, deleteTeacherAction, updateTeacherAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Teacher = {
  id: string;
  staffNo: string;
  subject: string | null;
  user: { name: string; email: string; phone: string | null };
  classes: Array<{ yearLevel: { labelBm: string }; name: string }>;
};

export function AdminTeachersClient({ teachers }: { teachers: Teacher[] }) {
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ error?: string; success?: boolean }>, onSuccess?: () => void) => {
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (result.error) setError(result.error);
      else {
        onSuccess?.();
        window.location.reload();
      }
    });
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Guru</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => createTeacherAction(new FormData(e.currentTarget)));
            }}
          >
            <div className="space-y-2">
              <Label>Nama</Label>
              <Input name="name" required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <Label>No. Kakitangan</Label>
              <Input name="staffNo" required />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input name="phone" type="tel" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Kata Laluan</Label>
              <Input name="password" type="password" required minLength={6} />
            </div>
            <Button type="submit" disabled={pending}>
              Simpan
            </Button>
          </form>
          {error && !editing && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Guru</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="pb-2 pr-4">Nama</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">No. Kakitangan</th>
                <th className="pb-2 pr-4">Kelas</th>
                <th className="pb-2">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{t.user.name}</td>
                  <td className="py-2 pr-4">{t.user.email}</td>
                  <td className="py-2 pr-4">{t.staffNo}</td>
                  <td className="py-2 pr-4">
                    {t.classes.map((c) => `${c.yearLevel.labelBm} ${c.name}`).join(", ") || "—"}
                  </td>
                  <td className="py-2">
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          setError(null);
                          setEditing(t);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (confirm("Padam guru ini?")) {
                            run(() => deleteTeacherAction(t.id));
                          }
                        }}
                      >
                        Padam
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={() => setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Guru</DialogTitle>
          </DialogHeader>
          {editing && (
            <form
              key={editing.id}
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                startTransition(async () => {
                  setError(null);
                  const result = await updateTeacherAction(fd);
                  if (result.error) setError(result.error);
                  else {
                    setEditing(null);
                    window.location.reload();
                  }
                });
              }}
            >
              <input type="hidden" name="teacherId" value={editing.id} />
              <div className="space-y-2">
                <Label>Nama</Label>
                <Input name="name" defaultValue={editing.user.name} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" defaultValue={editing.user.email} required />
              </div>
              <div className="space-y-2">
                <Label>No. Kakitangan</Label>
                <Input name="staffNo" defaultValue={editing.staffNo} required />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input name="phone" type="tel" defaultValue={editing.user.phone ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Subjek</Label>
                <Input name="subject" defaultValue={editing.subject ?? ""} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="edit-new-password">Kata Laluan Baharu</Label>
                <Input
                  id="edit-new-password"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={6}
                  placeholder="Biarkan kosong jika tiada perubahan"
                />
              </div>
              {error && <p className="sm:col-span-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={pending}>
                  {pending ? "Menyimpan..." : "Simpan"}
                </Button>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setEditing(null)}>
                  Batal
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
