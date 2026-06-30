"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download, Pencil, X } from "lucide-react";
import { format } from "date-fns";
import { REASON_LABELS } from "@/lib/constants";
import {
  createClassAction,
  addStudentAction,
  batchUpdateStudentsAction,
  importStudentsToClassAction,
} from "@/lib/actions/teacher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BirthCertInput } from "./BirthCertInput";
import { cn } from "@/lib/utils";

import { normalizeBirthCert } from "@/lib/birth-cert";
import type { getTeacherClasses } from "@/lib/actions/teacher";

type ClassData = Awaited<ReturnType<typeof getTeacherClasses>>[number];
type StudentRow = ClassData["students"][number];
type SortColumn = "birthCert" | "studentNo" | "name" | "appointmentCount" | "lastDate" | "reason";
type SortDirection = "asc" | "desc";

type StudentDraft = {
  studentNo: string;
  name: string;
  birthCert: string;
  originalBirthCert: string;
};

function birthCertChanged(current: string, original: string) {
  return normalizeBirthCert(current) !== normalizeBirthCert(original);
}

function lastAppointmentDate(student: StudentRow): Date | null {
  const last = student.appointments[0];
  if (!last) return null;
  return last.slot?.date ?? last.bookedAt;
}

function lastAppointmentReason(student: StudentRow): string {
  const last = student.appointments[0];
  return last ? REASON_LABELS[last.reason] : "";
}

function compareStudents(a: StudentRow, b: StudentRow, column: SortColumn, direction: SortDirection) {
  const factor = direction === "asc" ? 1 : -1;

  switch (column) {
    case "birthCert":
      return factor * (a.birthCert ?? "").localeCompare(b.birthCert ?? "", "ms");
    case "studentNo":
      return factor * a.studentNo.localeCompare(b.studentNo, "ms", { numeric: true });
    case "name":
      return factor * a.name.localeCompare(b.name, "ms");
    case "appointmentCount":
      return factor * (a.appointments.length - b.appointments.length);
    case "lastDate": {
      const aDate = lastAppointmentDate(a);
      const bDate = lastAppointmentDate(b);
      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return factor * (aDate.getTime() - bDate.getTime());
    }
    case "reason":
      return factor * lastAppointmentReason(a).localeCompare(lastAppointmentReason(b), "ms");
  }
}

function SortableHeader({
  label,
  column,
  activeColumn,
  direction,
  onSort,
}: {
  label: string;
  column: SortColumn;
  activeColumn: SortColumn | null;
  direction: SortDirection;
  onSort: (column: SortColumn) => void;
}) {
  const active = activeColumn === column;
  const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="pb-2 pr-4">
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 font-medium transition-colors hover:text-slate-800",
          active ? "text-slate-800" : "text-slate-500"
        )}
      >
        {label}
        <Icon className={cn("h-3.5 w-3.5", active ? "text-teal-700" : "text-slate-400")} />
      </button>
    </th>
  );
}

function CollapsibleSection({
  title,
  description,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </div>
        <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  );
}

function ClassStudentTable({
  cls,
  editing,
  drafts,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSave,
  saving,
}: {
  cls: ClassData;
  editing: boolean;
  drafts: Record<string, StudentDraft>;
  onDraftChange: (id: string, field: keyof StudentDraft, value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  saving: boolean;
}) {
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedStudents = useMemo(() => {
    if (!sortColumn) return cls.students;
    return [...cls.students].sort((a, b) => compareStudents(a, b, sortColumn, sortDirection));
  }, [cls.students, sortColumn, sortDirection]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle>
          {cls.yearLevel.labelBm} {cls.name}
        </CardTitle>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={onCancelEdit} disabled={saving}>
                <X className="mr-1 h-4 w-4" />
                Batal
              </Button>
              <Button type="button" size="sm" onClick={onSave} disabled={saving}>
                {saving ? "Menyimpan..." : "Simpan"}
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={onStartEdit}>
              <Pencil className="mr-1 h-4 w-4" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <SortableHeader
                label="No. Sijil Lahir"
                column="birthCert"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="No. Murid"
                column="studentNo"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Nama"
                column="name"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Bil. Temujanji"
                column="appointmentCount"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Terakhir"
                column="lastDate"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                label="Sebab"
                column="reason"
                activeColumn={sortColumn}
                direction={sortDirection}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedStudents.map((s) => {
              const last = s.appointments[0];
              const draft = drafts[s.id];
              return (
                <tr key={s.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">
                    {editing ? (
                      <Input
                        value={draft?.birthCert ?? ""}
                        onChange={(e) => onDraftChange(s.id, "birthCert", e.target.value)}
                        placeholder="Biarkan kosong jika tiada perubahan"
                        className="min-w-[180px] text-sm"
                      />
                    ) : (
                      <span className="font-mono text-slate-700">{s.birthCert ?? "—"}</span>
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editing ? (
                      <Input
                        value={draft?.studentNo ?? ""}
                        onChange={(e) => onDraftChange(s.id, "studentNo", e.target.value)}
                        className="min-w-[100px] text-sm"
                      />
                    ) : (
                      s.studentNo
                    )}
                  </td>
                  <td className="py-2 pr-4">
                    {editing ? (
                      <Input
                        value={draft?.name ?? ""}
                        onChange={(e) => onDraftChange(s.id, "name", e.target.value)}
                        className="min-w-[160px] text-sm"
                      />
                    ) : (
                      s.name
                    )}
                  </td>
                  <td className="py-2 pr-4">{s.appointments.length}</td>
                  <td className="py-2 pr-4">
                    {last ? format(last.slot?.date ?? last.bookedAt, "dd/MM/yyyy") : "—"}
                  </td>
                  <td className="py-2">{last ? REASON_LABELS[last.reason] : "—"}</td>
                </tr>
              );
            })}
            {sortedStudents.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-slate-400">
                  Tiada murid
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {editing && (
          <p className="mt-3 text-xs text-slate-500">
            Biarkan No. Sijil Lahir kosong jika tiada perubahan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function TeacherClassClient({ classes }: { classes: ClassData[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id ?? "");
  const [importClassId, setImportClassId] = useState(classes[0]?.id ?? "");
  const [importMode, setImportMode] = useState<"add" | "replace">("add");
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, StudentDraft>>({});

  const startEdit = (cls: ClassData) => {
    setError(null);
    setEditingClassId(cls.id);
    const next: Record<string, StudentDraft> = {};
    for (const s of cls.students) {
      const originalBirthCert = s.birthCert ?? "";
      next[s.id] = {
        studentNo: s.studentNo,
        name: s.name,
        birthCert: originalBirthCert,
        originalBirthCert,
      };
    }
    setDrafts(next);
  };

  const cancelEdit = () => {
    setEditingClassId(null);
    setDrafts({});
  };

  const updateDraft = (id: string, field: keyof StudentDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveEdits = (classId: string, studentIds: string[]) => {
    setError(null);
    startTransition(async () => {
      const updates = studentIds.map((id) => {
        const draft = drafts[id];
        const birthCertValue = draft?.birthCert?.trim() ?? "";
        const shouldUpdateBirthCert =
          birthCertValue.length > 0 && birthCertChanged(birthCertValue, draft?.originalBirthCert ?? "");
        return {
          id,
          studentNo: draft?.studentNo ?? "",
          name: draft?.name ?? "",
          birthCert: shouldUpdateBirthCert ? birthCertValue : undefined,
        };
      });
      const result = await batchUpdateStudentsAction({ classId, updates });
      if (result.error) {
        setError(result.error);
      } else {
        setMessage("Senarai murid berjaya dikemaskini.");
        setEditingClassId(null);
        setDrafts({});
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-8">
      {(error || message) && (
        <p className={`text-sm whitespace-pre-line ${error ? "text-red-600" : "text-emerald-600"}`}>
          {error ?? message}
        </p>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Tiada kelas lagi. Tambah kelas di bawah untuk mula.
          </CardContent>
        </Card>
      ) : (
        classes.map((cls) => (
          <ClassStudentTable
            key={cls.id}
            cls={cls}
            editing={editingClassId === cls.id}
            drafts={drafts}
            onDraftChange={updateDraft}
            onStartEdit={() => startEdit(cls)}
            onCancelEdit={cancelEdit}
            onSave={() => saveEdits(cls.id, cls.students.map((s) => s.id))}
            saving={pending && editingClassId === cls.id}
          />
        ))
      )}

      <CollapsibleSection title="Tambah Kelas" description="Cipta kelas baharu untuk sesi semasa">
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setMessage(null);
            const fd = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await createClassAction(
                parseInt(String(fd.get("yearLevel")), 10),
                String(fd.get("name"))
              );
              if (result.error) setError(result.error);
              else {
                setMessage("Kelas berjaya ditambah.");
                router.refresh();
              }
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="yearLevel">Tahun</Label>
            <select
              id="yearLevel"
              name="yearLevel"
              className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
              required
            >
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Tahun {y}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="className">Nama Kelas</Label>
            <Input id="className" name="name" placeholder="Bestari" required />
          </div>
          <Button type="submit" disabled={pending}>
            Tambah
          </Button>
        </form>
      </CollapsibleSection>

      <CollapsibleSection
        title="Tambah Murid"
        description="Tambah murid secara manual atau import dari Excel"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Borang Manual</h4>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                setMessage(null);
                const form = e.currentTarget;
                startTransition(async () => {
                  const result = await addStudentAction(new FormData(form));
                  if (result.error) setError(result.error);
                  else {
                    setMessage("Murid berjaya ditambah.");
                    form.reset();
                    router.refresh();
                  }
                });
              }}
            >
              <div className="space-y-2">
                <Label>Kelas</Label>
                <select
                  name="classId"
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.yearLevel.labelBm} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentNo">No. Murid</Label>
                <Input id="studentNo" name="studentNo" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentName">Nama</Label>
                <Input id="studentName" name="name" required />
              </div>
              <BirthCertInput />
              <Button type="submit" disabled={pending || classes.length === 0}>
                Tambah Murid
              </Button>
            </form>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-slate-900">Import Excel</h4>
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                setError(null);
                setMessage(null);
                const fd = new FormData(e.currentTarget);
                fd.set("classId", importClassId);
                fd.set("mode", importMode);
                startTransition(async () => {
                  const result = await importStudentsToClassAction(fd);
                  if (result.error) setError(result.error);
                  else {
                    setMessage(result.message ?? `${result.imported ?? 0} murid diimport.`);
                    router.refresh();
                  }
                });
              }}
            >
              <div className="space-y-2">
                <Label>Kelas</Label>
                <select
                  value={importClassId}
                  onChange={(e) => setImportClassId(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
                  required
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.yearLevel.labelBm} {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Mod Import</Label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("add")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      importMode === "add"
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Tambah sahaja
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                      importMode === "replace"
                        ? "border-teal-600 bg-teal-50 text-teal-800"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    )}
                  >
                    Ganti senarai
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {importMode === "add"
                    ? "Murid baharu ditambah; rekod sedia ada dikekalkan."
                    : "Murid tanpa temujanji dibuang, kemudian senarai dari fail dimuat naik. Murid dengan temujanji dikekalkan."}
                </p>
              </div>
              <p className="text-xs text-slate-500">
                Lajur: No Murid, Nama, No Sijil Lahir. Muat turun templat untuk format yang betul.
              </p>
              <Button type="button" variant="outline" asChild>
                <a href="/api/teacher/students/template" download="templat-senarai-murid.xlsx">
                  <Download className="mr-1 h-4 w-4" />
                  Muat Turun Templat
                </a>
              </Button>
              <Input type="file" name="file" accept=".xlsx,.xls,.csv" required />
              <Button type="submit" disabled={pending || classes.length === 0}>
                Muat Naik
              </Button>
            </form>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}
