"use server";

import { revalidatePath } from "next/cache";
import { AppointmentReason } from "@prisma/client";
import { createAppointment, cancelAppointment, BookingError } from "@/lib/booking";
import { getParentSession } from "@/lib/parent-session";
import { prisma } from "@/lib/prisma";

export async function bookAppointmentAction(formData: FormData) {
  const session = await getParentSession();
  if (!session) return { error: "Sesi tamat. Sila sahkan semula No. Sijil Lahir." };

  try {
    const appointment = await createAppointment({
      studentId: session.studentId,
      slotId: String(formData.get("slotId")),
      parentName: String(formData.get("parentName")),
      parentPhone: String(formData.get("parentPhone")),
      reason: String(formData.get("reason")) as AppointmentReason,
    });

    revalidatePath("/book/appointment");
    return { success: true, referenceNo: appointment.referenceNo };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    return { error: "Ralat berlaku. Sila cuba lagi." };
  }
}

export async function cancelAppointmentAction(appointmentId: string) {
  const session = await getParentSession();
  if (!session) return { error: "Sesi tamat." };

  try {
    await cancelAppointment(appointmentId, session.studentId);
    revalidatePath("/semak");
    return { success: true };
  } catch (e) {
    if (e instanceof BookingError) return { error: e.message };
    return { error: "Ralat berlaku." };
  }
}

export async function getStudentBookingContext() {
  const session = await getParentSession();
  if (!session) return null;

  return prisma.student.findUnique({
    where: { id: session.studentId },
    include: {
      class: {
        include: {
          yearLevel: true,
          teacher: { include: { user: true } },
        },
      },
      session: true,
      appointments: {
        where: { status: { in: ["PENDING", "APPROVED"] } },
        take: 1,
      },
    },
  });
}

export async function getMonthCalendarData(year: number, month: number) {
  const session = await getParentSession();
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: { class: true },
  });
  if (!student) return null;

  const teacherId = student.class.teacherId;
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);

  const slots = await prisma.teacherSlot.findMany({
    where: {
      teacherId,
      date: { gte: start, lte: end },
    },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { notIn: ["CANCELLED", "REJECTED"] } },
          },
        },
      },
    },
  });

  const blackouts = await prisma.blackoutDate.findMany({
    where: {
      OR: [{ startDate: { lte: end }, endDate: { gte: start } }],
    },
  });

  return {
    slots: slots.map((s) => ({
      date: s.date.toISOString(),
      isOpen: s.isOpen,
      booked: s._count.appointments,
      maxBookings: s.maxBookings,
    })),
    blackouts: blackouts.map((b) => ({
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      title: b.title,
    })),
    teacherId,
  };
}

export async function getDaySlotsAction(dateStr: string) {
  const session = await getParentSession();
  if (!session) return null;

  const student = await prisma.student.findUnique({
    where: { id: session.studentId },
    include: { class: true },
  });
  if (!student) return null;

  const { getSlotsForTeacherDate, isDateBlackedOut } = await import("@/lib/slots");
  const date = new Date(dateStr);
  const blackout = await isDateBlackedOut(date);
  const slots = await getSlotsForTeacherDate(student.class.teacherId, date);

  return { slots, blackout, date: dateStr };
}
