"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { birthCertStorageFields } from "@/lib/birth-cert";
import { logAudit, getRecentAuditLogs } from "@/lib/audit";
import { parseStudentExcel, exportToCsv } from "@/lib/excel";
import { parseDateInput } from "@/lib/slots";
import { REASON_LABELS, STATUS_LABELS } from "@/lib/constants";
import { format } from "date-fns";
import { getActiveAcademicSession } from "@/lib/session";

async function requireAdmin() {
  return requireAuth(["ADMIN"]);
}

export async function getAdminDashboard() {
  const session = await getActiveAcademicSession();
  if (!session) return null;

  const [teachers, students, appointments, todayAppts, blackouts, auditLogs] = await Promise.all([
    prisma.teacher.count(),
    prisma.student.count({ where: { sessionId: session.id } }),
    prisma.appointment.count({ where: { sessionId: session.id } }),
    prisma.appointment.count({
      where: {
        sessionId: session.id,
        bookedAt: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
        },
      },
    }),
    prisma.blackoutDate.findMany({
      where: { endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 5,
    }),
    getRecentAuditLogs(10),
  ]);

  const byReason = await prisma.appointment.groupBy({
    by: ["reason"],
    where: { sessionId: session.id },
    _count: true,
  });

  const byYear = await prisma.student.groupBy({
    by: ["classId"],
    where: { sessionId: session.id },
    _count: true,
  });

  const classes = await prisma.class.findMany({
    where: { sessionId: session.id },
    include: { yearLevel: true },
  });

  const yearBreakdown = classes.map((c) => ({
    name: `${c.yearLevel.labelBm} ${c.name}`,
    count: byYear.find((b) => b.classId === c.id)?._count ?? 0,
  }));

  const heatmapData = await prisma.appointment.findMany({
    where: { sessionId: session.id },
    include: { slot: true },
  });

  const dateMap = new Map<string, number>();
  heatmapData.forEach((a) => {
    const key = format(a.slot.date, "yyyy-MM-dd");
    dateMap.set(key, (dateMap.get(key) ?? 0) + 1);
  });

  const heatmap = Array.from(dateMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-28);

  const lowSlotTeachers = await prisma.teacher.findMany({
    include: {
      user: true,
      slots: {
        where: { isOpen: true, date: { gte: new Date() } },
      },
      classes: { where: { sessionId: session.id }, include: { _count: { select: { students: true } } } },
    },
  });

  const teacherAlerts = lowSlotTeachers
    .filter((t) => t.slots.length < 5 && t.classes.some((c) => c._count.students > 0))
    .map((t) => ({ name: t.user.name, openSlots: t.slots.length }));

  return {
    session,
    teachers,
    students,
    appointments,
    todayAppts,
    blackouts,
    auditLogs,
    reasonData: byReason.map((r) => ({
      name: REASON_LABELS[r.reason] ?? r.reason,
      count: r._count,
    })),
    yearBreakdown,
    heatmap,
    teacherAlerts,
  };
}

export async function createTeacherAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const email = String(formData.get("email")).trim().toLowerCase();
  const name = String(formData.get("name")).trim();
  const staffNo = String(formData.get("staffNo")).trim();
  const password = String(formData.get("password"));
  const phone = String(formData.get("phone") || "").trim();

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, phone: phone || null, passwordHash, role: "TEACHER" },
    });
    await prisma.teacher.create({ data: { userId: user.id, staffNo } });
    await logAudit({
      userId: admin.user.id,
      action: "CREATE",
      entity: "Teacher",
      details: email,
    });
    revalidatePath("/admin/teachers");
    return { success: true };
  } catch {
    return { error: "Email atau No. Kakitangan sudah wujud." };
  }
}

export async function deleteTeacherAction(teacherId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const teacher = await prisma.teacher.findUnique({ where: { id: teacherId } });
  if (!teacher) return { error: "Guru tidak dijumpai." };

  await prisma.user.delete({ where: { id: teacher.userId } });
  await logAudit({ userId: admin.user.id, action: "DELETE", entity: "Teacher", entityId: teacherId });
  revalidatePath("/admin/teachers");
  return { success: true };
}

export async function updateTeacherAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const teacherId = String(formData.get("teacherId") || "").trim();
  if (!teacherId) return { error: "Guru tidak dijumpai." };

  const teacher = await prisma.teacher.findUnique({
    where: { id: teacherId },
    include: { user: true },
  });
  if (!teacher) return { error: "Guru tidak dijumpai." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const staffNo = String(formData.get("staffNo") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const subject = String(formData.get("subject") ?? "").trim();
  const password = String(formData.get("newPassword") ?? "").trim();

  if (!name || !email || !staffNo) return { error: "Nama, email dan no. kakitangan diperlukan." };
  if (password && password.length < 6) {
    return { error: "Kata laluan mesti sekurang-kurangnya 6 aksara." };
  }

  const emailTaken = await prisma.user.findFirst({
    where: { email, id: { not: teacher.userId } },
  });
  if (emailTaken) return { error: "Email sudah digunakan oleh guru lain." };

  const staffNoTaken = await prisma.teacher.findFirst({
    where: { staffNo, id: { not: teacherId } },
  });
  if (staffNoTaken) return { error: "No. Kakitangan sudah digunakan oleh guru lain." };

  let passwordHash: string | undefined;
  if (password) {
    try {
      passwordHash = await bcrypt.hash(password, 10);
    } catch {
      return { error: "Gagal memproses kata laluan baharu." };
    }
  }

  try {
    const userData: Prisma.UserUpdateInput = {
      name,
      email,
      phone: phone || null,
    };
    if (passwordHash) {
      userData.passwordHash = passwordHash;
    }

    await prisma.user.update({
      where: { id: teacher.userId },
      data: userData,
    });

    await prisma.teacher.update({
      where: { id: teacherId },
      data: { staffNo, subject: subject || null },
    });

    try {
      await logAudit({
        userId: admin.user.id,
        action: "UPDATE",
        entity: "Teacher",
        entityId: teacherId,
        details: passwordHash ? `${email} (kata laluan dikemaskini)` : email,
      });
    } catch {
      // Audit failure should not block a successful profile update.
    }

    revalidatePath("/admin/teachers");
    return { success: true };
  } catch (error) {
    const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
    if (code === "P2002") {
      return { error: "Email atau No. Kakitangan sudah wujud." };
    }
    return { error: "Gagal menyimpan perubahan guru." };
  }
}

export async function getTeachers() {
  return prisma.teacher.findMany({
    include: {
      user: true,
      classes: {
        where: { session: { isActive: true } },
        include: { yearLevel: true },
      },
    },
    orderBy: { user: { name: "asc" } },
  });
}

export async function importStudentsAdminAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const file = formData.get("file") as File;
  const teacherId = String(formData.get("teacherId"));
  if (!file || !teacherId) return { error: "Data tidak lengkap." };

  const buffer = await file.arrayBuffer();
  const { rows, errors } = parseStudentExcel(buffer);
  if (errors.length > 0) return { error: errors.join("\n") };

  const session = await getActiveAcademicSession();
  if (!session) return { error: "Tiada sesi aktif." };

  let imported = 0;
  for (const row of rows) {
    const yearLevel = await prisma.schoolYearLevel.findUnique({ where: { level: row.tahun } });
    if (!yearLevel) continue;

    let cls = await prisma.class.findFirst({
      where: {
        teacherId,
        sessionId: session.id,
        yearLevelId: yearLevel.id,
        name: row.kelas,
      },
    });

    if (!cls) {
      cls = await prisma.class.create({
        data: {
          teacherId,
          sessionId: session.id,
          yearLevelId: yearLevel.id,
          name: row.kelas,
        },
      });
    }

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
      // skip
    }
  }

  await logAudit({
    userId: admin.user.id,
    action: "IMPORT",
    entity: "Student",
    details: `${imported} murid diimport`,
  });
  revalidatePath("/admin/students");
  return { success: true, imported };
}

export async function getAllStudents() {
  const session = await getActiveAcademicSession();
  if (!session) return [];

  return prisma.student.findMany({
    where: { sessionId: session.id },
    include: {
      class: { include: { yearLevel: true, teacher: { include: { user: true } } } },
    },
    orderBy: { name: "asc" },
  });
}

export async function createBlackoutAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const startDate = parseDateInput(String(formData.get("startDate")));
  const endDate = parseDateInput(String(formData.get("endDate")));
  const title = String(formData.get("title")).trim();

  await prisma.blackoutDate.create({
    data: { startDate, endDate, title, createdBy: admin.user.id },
  });
  await logAudit({ userId: admin.user.id, action: "CREATE", entity: "Blackout", details: title });
  revalidatePath("/admin/blackouts");
  revalidatePath("/");
  return { success: true };
}

export async function deleteBlackoutAction(id: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  await prisma.blackoutDate.delete({ where: { id } });
  await logAudit({ userId: admin.user.id, action: "DELETE", entity: "Blackout", entityId: id });
  revalidatePath("/admin/blackouts");
  revalidatePath("/");
  return { success: true };
}

export async function getBlackouts() {
  return prisma.blackoutDate.findMany({
    orderBy: { startDate: "desc" },
    include: { creator: { select: { name: true } } },
  });
}

export async function getSessions() {
  return prisma.academicSession.findMany({ orderBy: { startDate: "desc" } });
}

export async function setActiveSessionAction(sessionId: string) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  await prisma.$transaction([
    prisma.academicSession.updateMany({ data: { isActive: false } }),
    prisma.academicSession.update({ where: { id: sessionId }, data: { isActive: true } }),
  ]);
  await logAudit({ userId: admin.user.id, action: "UPDATE", entity: "AcademicSession", entityId: sessionId });
  revalidatePath("/admin");
  return { success: true };
}

export async function createSessionAction(formData: FormData) {
  const admin = await requireAdmin();
  if (!admin) return { error: "Tidak dibenarkan." };

  const label = String(formData.get("label")).trim();
  const startDate = parseDateInput(String(formData.get("startDate")));
  const endDate = parseDateInput(String(formData.get("endDate")));
  const setActive = formData.get("setActive") === "on";

  if (setActive) {
    await prisma.academicSession.updateMany({ data: { isActive: false } });
  }

  await prisma.academicSession.create({
    data: { label, startDate, endDate, isActive: setActive },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function getMonitorData() {
  const session = await getActiveAcademicSession();
  if (!session) return { appointments: [], classes: [] };

  const [appointments, classes] = await Promise.all([
    prisma.appointment.findMany({
      where: { sessionId: session.id },
      include: {
        student: { include: { class: { include: { yearLevel: true } } } },
        slot: { include: { teacher: { include: { user: true } } } },
      },
      orderBy: { bookedAt: "desc" },
    }),
    prisma.class.findMany({
      where: { sessionId: session.id },
      include: { yearLevel: true, teacher: { include: { user: true } }, _count: { select: { students: true } } },
    }),
  ]);

  return { appointments, classes, session };
}

export async function exportAppointmentsCsv() {
  const { appointments } = await getMonitorData();
  const headers = ["Rujukan", "Murid", "Tahun", "Kelas", "Guru", "Tarikh", "Masa", "Sebab", "Status", "Ibu/Bapa", "Telefon"];
  const rows = appointments.map((a) => [
    a.referenceNo,
    a.student.name,
    a.student.class.yearLevel.labelBm,
    a.student.class.name,
    a.slot.teacher.user.name,
    format(a.slot.date, "dd/MM/yyyy"),
    a.slot.startTime,
    REASON_LABELS[a.reason] ?? a.reason,
    STATUS_LABELS[a.status] ?? a.status,
    a.parentName,
    a.parentPhone,
  ]);
  return exportToCsv(headers, rows);
}

export async function getLandingData() {
  const [session, blackouts] = await Promise.all([
    getActiveAcademicSession(),
    prisma.blackoutDate.findMany({
      where: { endDate: { gte: new Date() } },
      orderBy: { startDate: "asc" },
      take: 3,
    }),
  ]);
  return { session, blackouts };
}
