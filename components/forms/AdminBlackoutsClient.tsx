"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { createBlackoutAction, deleteBlackoutAction } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Blackout = {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  creator: { name: string };
};

export function AdminBlackoutsClient({ blackouts }: { blackouts: Blackout[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Tambah Sekatan Tempahan</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              startTransition(async () => {
                const result = await createBlackoutAction(new FormData(e.currentTarget));
                if (result.error) setError(result.error);
                else window.location.reload();
              });
            }}
          >
            <div className="space-y-2">
              <Label>Dari</Label>
              <Input type="date" name="startDate" required />
            </div>
            <div className="space-y-2">
              <Label>Hingga</Label>
              <Input type="date" name="endDate" required />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Tajuk (cth. Cuti Sekolah)</Label>
              <Input name="title" required />
            </div>
            <Button type="submit" disabled={pending}>
              Simpan
            </Button>
          </form>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Senarai Sekatan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {blackouts.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{b.title}</p>
                  <p className="text-slate-500">
                    {format(b.startDate, "d MMM yyyy")} – {format(b.endDate, "d MMM yyyy")} · {b.creator.name}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      await deleteBlackoutAction(b.id);
                      window.location.reload();
                    })
                  }
                >
                  Padam
                </Button>
              </li>
            ))}
            {blackouts.length === 0 && <li className="text-slate-400">Tiada sekatan</li>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
