"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { AppointmentStatus } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { birthCertStorageFields, decryptBirthCertForDisplay } from "@/lib/birth-cert";
import { logAudit } from "@/lib/audit";
import { parseStudentExcel } from "@/lib/excel";
import {
  applyDailySlots,
  applyWeeklySlots,
  applyWeekdayBulkSlots,
  applyMultiWeekdayBulkSlots,
  getSlotsForTeacherDate,
  parseDateInput,
  upsertTeacherSlot,
} from "@/lib/slots";
import { updateAppointmentStatus, rescheduleAppointment, BookingError } from "@/lib/booking";
import { getActiveAcademicSession } from "@/lib/session";

async function getTeacherId() {
  const session = await requireAuth(["TEACHER"]);
  if (!session?.user.teacherId) return null;
  return session.user.teacherId;
}

export async function getTeacherDashboard(teacherId: string) {
  const session = await getActiveAcademicSession();
  if (!session) return null;

  const classes = await prisma.class.findMany({
    where: { teacherId, sessionId: session.id },
    include: {
      yearLevel: true,
      students: {
        include: {
          appointments: {
            where: {
              sessionId: session.id,
              status: { notIn: ["CANCELLED", "REJECTED"] },
            },
          },
        },
      },
    },
  });

  const allStudents = classes.flatMap((c) => c.students);
  const bookedIds = new Set(
    allStudents.filter((s) => s.appointments.length > 0).map((s) => s.id)
  );

  const appointments = await prisma.appointment.findMany({
    where: {
      sessionId: session.id,
      student: { class: { teacherId } },
    },
    include: { student: { include: { class: { include: { yearLevel: true } } } } },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAppts = await prisma.appointment.count({
    where: {
      student: { class: { teacherId } },
      status: { in: ["PENDING", "APPROVED"] },
      slot: { date: { gte: today, lt: tomorrow } },
    },
  });

  const pending = appointments.filter((a) => a.status === "PENDING").length;

  const reasonCounts = {
    GENERAL: appointments.filter((a) => a.reason === "GENERAL").length,
    MIDTERM: appointments.filter((a) => a.reason === "MIDTERM").length,
    FINAL: appointments.filter((a) => a.reason === "FINAL").length,
  };

  const byYear = classes.map((c) => ({
    name: c.yearLevel.labelBm,
    count: c.students.filter((s) => bookedIds.has(s.id)).length,
  }));

  return {
    session,
    totalStudents: allStudents.length,
    bookedCount: bookedIds.size,
    pending,
    todayAppts,
    reasonCounts,
    byYear,
    bookedStudents: allStudents.filter((s) => bookedIds.has(s.id)),
    unbookedStudents: allStudents.filter((s) => !bookedIds.has(s.id)),
    classes,
  };
}

export async function createClassAction(yearLevel: number, name: string) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const session = await getActiveAcademicSession();
  if (!session) return { error: "Tiada sesi aktif." };

  const yearLevelRecord = await prisma.schoolYearLevel.findUnique({ where: { level: yearLevel } });
  if (!yearLevelRecord) return { error: "Tahun tidak sah." };

  try {
    await prisma.class.create({
      data: {
        sessionId: session.id,
        yearLevelId: yearLevelRecord.id,
        name: name.trim(),
        teacherId,
      },
    });
    revalidatePath("/teacher/class");
    return { success: true };
  } catch {
    return { error: "Kelas sudah wujud atau ralat berlaku." };
  }
}

export async function addStudentAction(formData: FormData) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const classId = String(formData.get("classId"));
  const studentNo = String(formData.get("studentNo")).trim();
  const name = String(formData.get("name")).trim();
  const birthCert = String(formData.get("birthCert")).trim();

  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
  if (!cls) return { error: "Kelas tidak dijumpai." };

  try {
    const fields = birthCertStorageFields(birthCert);
    await prisma.student.create({
      data: {
        studentNo,
        name,
        birthCertLookup: fields.birthCertLookup,
        birthCertEncrypted: fields.birthCertEncrypted,
        classId,
        sessionId: cls.sessionId,
      },
    });
    revalidatePath("/teacher/class");
    return { success: true };
  } catch {
    return { error: "No. Murid atau No. Sijil Lahir sudah wujud." };
  }
}

export async function batchUpdateStudentsAction(payload: {
  classId: string;
  updates: Array<{ id: string; studentNo: string; name: string; birthCert?: string }>;
}) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const { classId, updates } = payload;
  if (!classId || updates.length === 0) return { error: "Data tidak lengkap." };

  const activeSession = await getActiveAcademicSession();
  if (!activeSession) return { error: "Tiada sesi aktif." };

  const cls = await prisma.class.findFirst({
    where: {
      id: classId,
      teacherId,
      sessionId: activeSession.id,
    },
  });
  if (!cls) return { error: "Kelas tidak dijumpai." };

  const studentIds = updates.map((row) => row.id);
  const ownedCount = await prisma.student.count({
    where: { id: { in: studentIds }, classId: cls.id },
  });
  if (ownedCount !== updates.length) {
    return { error: "Sebahagian murid tidak dijumpai dalam kelas ini." };
  }

  try {
    for (const row of updates) {
      const data: { studentNo: string; name: string; birthCertLookup?: string; birthCertEncrypted?: string } = {
        studentNo: row.studentNo.trim(),
        name: row.name.trim(),
      };
      if (row.birthCert?.trim()) {
        try {
          const fields = birthCertStorageFields(row.birthCert);
          data.birthCertLookup = fields.birthCertLookup;
          data.birthCertEncrypted = fields.birthCertEncrypted;
        } catch {
          return { error: `Format No. Sijil Lahir tidak sah untuk ${row.studentNo}.` };
        }
      }
      await prisma.student.update({
        where: { id: row.id },
        data,
      });
    }
    revalidatePath("/teacher/class");
    return { success: true };
  } catch {
    return { error: "Gagal menyimpan. No. Murid atau No. Sijil Lahir mungkin sudah wujud." };
  }
}

export async function deleteStudentsAction(payload: { classId: string; studentIds: string[] }) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const { classId, studentIds } = payload;
  if (!classId || studentIds.length === 0) return { error: "Tiada murid dipilih." };

  const activeSession = await getActiveAcademicSession();
  if (!activeSession) return { error: "Tiada sesi aktif." };

  const cls = await prisma.class.findFirst({
    where: { id: classId, teacherId, sessionId: activeSession.id },
  });
  if (!cls) return { error: "Kelas tidak dijumpai." };

  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, classId: cls.id },
  });

  if (students.length !== studentIds.length) {
    return { error: "Sebahagian murid tidak dijumpai dalam kelas ini." };
  }

  await prisma.student.deleteMany({ where: { id: { in: studentIds }, classId: cls.id } });

  revalidatePath("/teacher/class");

  return {
    success: true,
    deleted: students.length,
    message: `${students.length} murid dipadam.`,
  };
}

export async function importStudentsToClassAction(formData: FormData) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const file = formData.get("file") as File;
  const classId = String(formData.get("classId"));
  const mode = String(formData.get("mode")) as "add" | "replace";

  if (!file || !classId) return { error: "Data tidak lengkap." };

  const cls = await prisma.class.findFirst({ where: { id: classId, teacherId } });
  if (!cls) return { error: "Kelas tidak dijumpai." };

  const buffer = await file.arrayBuffer();
  const { parseClassStudentExcel } = await import("@/lib/excel");
  const { rows, errors } = parseClassStudentExcel(buffer);
  if (errors.length > 0) return { error: errors.join("\n") };
  if (rows.length === 0) return { error: "Tiada data dalam fail." };

  let imported = 0;
  let removed = 0;

  if (mode === "replace") {
    const result = await prisma.student.deleteMany({ where: { classId } });
    removed = result.count;
  }

  for (const row of rows) {
    try {
      const fields = birthCertStorageFields(row.birthCert);
      await prisma.student.create({
        data: {
          studentNo: row.studentNo,
          name: row.name,
          birthCertLookup: fields.birthCertLookup,
          birthCertEncrypted: fields.birthCertEncrypted,
          classId: cls.id,
          sessionId: cls.sessionId,
        },
      });
      imported++;
    } catch {
      if (mode === "add") {
        // skip duplicate in add mode
      } else {
        try {
          const fields = birthCertStorageFields(row.birthCert);
          await prisma.student.update({
            where: {
              sessionId_studentNo: { sessionId: cls.sessionId, studentNo: row.studentNo },
            },
            data: {
              name: row.name,
              birthCertLookup: fields.birthCertLookup,
              birthCertEncrypted: fields.birthCertEncrypted,
              classId: cls.id,
            },
          });
          imported++;
        } catch {
          // skip
        }
      }
    }
  }

  revalidatePath("/teacher/class");
  const parts = [`${imported} murid diimport`];
  if (mode === "replace" && removed > 0) parts.push(`${removed} murid dibuang`);
  return { success: true, imported, message: parts.join(", ") + "." };
}

export async function importStudentsAction(formData: FormData) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const file = formData.get("file") as File;
  if (!file) return { error: "Fail tidak dijumpai." };

  const buffer = await file.arrayBuffer();
  const { rows, errors } = parseStudentExcel(buffer);
  if (errors.length > 0) return { error: errors.join("\n") };

  const session = await getActiveAcademicSession();
  if (!session) return { error: "Tiada sesi aktif." };

  let imported = 0;
  for (const row of rows) {
    const yearLevel = await prisma.schoolYearLevel.findUnique({ where: { level: row.tahun } });
    if (!yearLevel) continue;

    const cls = await prisma.class.findFirst({
      where: {
        teacherId,
        sessionId: session.id,
        yearLevelId: yearLevel.id,
        name: row.kelas,
      },
    });
    if (!cls) continue;

    try {
      const fields = birthCertStorageFields(row.birthCert);
      await prisma.student.create({
        data: {
          studentNo: row.studentNo,
          name: row.name,
          birthCertLookup: fields.birthCertLookup,
          birthCertEncrypted: fields.birthCertEncrypted,
          classId: cls.id,
          sessionId: session.id,
        },
      });
      imported++;
    } catch {
      // skip duplicates
    }
  }

  revalidatePath("/teacher/class");
  return { success: true, imported };
}

export async function getTeacherClasses(teacherId: string) {
  const session = await getActiveAcademicSession();
  if (!session) return [];

  const classes = await prisma.class.findMany({
    where: { teacherId, sessionId: session.id },
    include: {
      yearLevel: true,
      students: {
        include: {
          appointments: {
            where: { sessionId: session.id, status: { notIn: ["CANCELLED", "REJECTED"] } },
            orderBy: { bookedAt: "desc" },
            take: 1,
            include: { slot: true },
          },
          _count: { select: { appointments: true } },
        },
      },
    },
    orderBy: [{ yearLevel: { level: "asc" } }, { name: "asc" }],
  });

  return classes.map((cls) => ({
    ...cls,
    students: cls.students.map((s) => ({
      ...s,
      birthCert: decryptBirthCertForDisplay(s.birthCertEncrypted),
    })),
  }));
}

export async function toggleSlotAction(dateStr: string, startTime: string, isOpen: boolean) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  await upsertTeacherSlot(teacherId, parseDateInput(dateStr), startTime, isOpen);
  revalidatePath("/teacher/slots");
  return { success: true };
}

export async function bulkWeekdaySlotsAction(
  startDateStr: string,
  endDateStr: string,
  weekday: number,
  startTimes: string[]
) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };
  if (!startTimes.length) return { error: "Sila pilih sekurang-kurangnya satu slot masa." };
  if (weekday < 1 || weekday > 5) return { error: "Hari tidak sah." };

  const startDate = parseDateInput(startDateStr);
  const endDate = parseDateInput(endDateStr);
  if (endDate < startDate) return { error: "Tarikh tamat mesti selepas tarikh mula." };

  const count = await applyWeekdayBulkSlots(teacherId, startDate, endDate, weekday, startTimes, true);
  revalidatePath("/teacher/slots");
  return { success: true, count };
}

export async function bulkMultiWeekdaySlotsAction(
  startDateStr: string,
  endDateStr: string,
  schedule: Record<number, string[]>
) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const hasSlots = Object.values(schedule).some((times) => times.length > 0);
  if (!hasSlots) return { error: "Sila pilih slot untuk sekurang-kurangnya satu hari." };

  const startDate = parseDateInput(startDateStr);
  const endDate = parseDateInput(endDateStr);
  if (endDate < startDate) return { error: "Tarikh tamat mesti selepas tarikh mula." };

  const count = await applyMultiWeekdayBulkSlots(teacherId, startDate, endDate, schedule, true);
  revalidatePath("/teacher/slots");
  return { success: true, count };
}

/** @deprecated Use bulkWeekdaySlotsAction */
export async function bulkDailySlotsAction(formData: FormData) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const startDate = parseDateInput(String(formData.get("startDate")));
  const endDate = parseDateInput(String(formData.get("endDate")));
  const startTime = String(formData.get("startTime"));
  const count = await applyDailySlots(teacherId, startDate, endDate, startTime, true);
  revalidatePath("/teacher/slots");
  return { success: true, count };
}

/** @deprecated Use bulkMultiWeekdaySlotsAction */
export async function bulkWeeklySlotsAction(formData: FormData) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  const startDate = parseDateInput(String(formData.get("startDate")));
  const endDate = parseDateInput(String(formData.get("endDate")));
  const weekday = parseInt(String(formData.get("weekday")), 10);
  const startTime = String(formData.get("startTime"));
  const count = await applyWeeklySlots(teacherId, startDate, endDate, weekday, startTime, true);
  revalidatePath("/teacher/slots");
  return { success: true, count };
}

export async function getTeacherSlotsForDate(teacherId: string, dateStr: string) {
  return getSlotsForTeacherDate(teacherId, parseDateInput(dateStr));
}

export async function getTeacherAppointments(teacherId: string) {
  const session = await getActiveAcademicSession();
  if (!session) return [];

  return prisma.appointment.findMany({
    where: {
      sessionId: session.id,
      student: { class: { teacherId } },
    },
    include: {
      slot: true,
      student: { include: { class: { include: { yearLevel: true } } } },
    },
    orderBy: { slot: { date: "asc" } },
  });
}

export async function approveAppointmentAction(id: string) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  try {
    await updateAppointmentStatus(id, AppointmentStatus.APPROVED, teacherId);
    revalidatePath("/teacher/appointments");
    return { success: true };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    return { error: "Ralat berlaku." };
  }
}

export async function rejectAppointmentAction(id: string) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  try {
    await updateAppointmentStatus(id, AppointmentStatus.REJECTED, teacherId);
    revalidatePath("/teacher/appointments");
    return { success: true };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    return { error: "Ralat berlaku." };
  }
}

export async function rescheduleAppointmentAction(id: string, newSlotId: string) {
  const teacherId = await getTeacherId();
  if (!teacherId) return { error: "Tidak dibenarkan." };

  try {
    await rescheduleAppointment(id, newSlotId, teacherId);
    revalidatePath("/teacher/appointments");
    return { success: true };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    return { error: e instanceof Error ? e.message : "Ralat berlaku." };
  }
}

export async function getTeacherOpenSlots(teacherId: string) {
  return prisma.teacherSlot.findMany({
    where: {
      teacherId,
      isOpen: true,
      date: { gte: new Date() },
    },
    include: { _count: { select: { appointments: true } } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });
}
