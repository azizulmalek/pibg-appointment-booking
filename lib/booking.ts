import { prisma } from "./prisma";
import { AppointmentReason, AppointmentStatus } from "@prisma/client";
import { isDateBlackedOut } from "./slots";
import { startOfDay } from "date-fns";

export class BookingError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

function generateReferenceNo(): string {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PIBG-${year}-${rand}`;
}

export async function createAppointment(params: {
  studentId: string;
  slotId: string;
  parentName: string;
  parentPhone: string;
  reason: AppointmentReason;
}) {
  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: params.studentId },
      include: { session: true, class: { include: { teacher: true } } },
    });

    if (!student || !student.session.isActive) {
      throw new BookingError("Murid tidak berdaftar untuk sesi semasa.", "INACTIVE_SESSION");
    }

    const existing = await tx.appointment.findFirst({
      where: {
        studentId: params.studentId,
        sessionId: student.sessionId,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.APPROVED] },
      },
    });

    if (existing) {
      throw new BookingError(
        "Murid ini sudah mempunyai temujanji aktif. Sila batalkan atau hubungi guru.",
        "ACTIVE_APPOINTMENT"
      );
    }

    const slot = await tx.teacherSlot.findUnique({
      where: { id: params.slotId },
      include: {
        _count: {
          select: {
            appointments: {
              where: { status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED] } },
            },
          },
        },
      },
    });

    if (!slot || !slot.isOpen) {
      throw new BookingError("Slot tidak tersedia.", "SLOT_UNAVAILABLE");
    }

    if (slot.teacherId !== student.class.teacherId) {
      throw new BookingError("Slot tidak sah untuk murid ini.", "INVALID_SLOT");
    }

    const blackout = await isDateBlackedOut(slot.date);
    if (blackout.blocked) {
      throw new BookingError(`Tempahan ditutup: ${blackout.title}`, "BLACKOUT");
    }

    if (slot._count.appointments >= slot.maxBookings) {
      throw new BookingError("Slot sudah penuh.", "SLOT_FULL");
    }

    return tx.appointment.create({
      data: {
        studentId: params.studentId,
        slotId: params.slotId,
        sessionId: student.sessionId,
        parentName: params.parentName,
        parentPhone: params.parentPhone,
        reason: params.reason,
        referenceNo: generateReferenceNo(),
        status: AppointmentStatus.PENDING,
      },
      include: {
        slot: true,
        student: { include: { class: { include: { yearLevel: true, teacher: { include: { user: true } } } } } },
      },
    });
  });
}

export async function getCalendarDayStatus(
  teacherId: string,
  date: Date
): Promise<"grey" | "red" | "green"> {
  const blackout = await isDateBlackedOut(date);
  if (blackout.blocked) return "grey";

  const day = startOfDay(date);
  const slots = await prisma.teacherSlot.findMany({
    where: { teacherId, date: day, isOpen: true },
    include: {
      _count: {
        select: {
          appointments: {
            where: { status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED] } },
          },
        },
      },
    },
  });

  if (slots.length === 0) return "grey";

  const hasAvailable = slots.some((s) => s._count.appointments < s.maxBookings);
  if (hasAvailable) return "green";
  return "red";
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: AppointmentStatus,
  teacherId?: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { student: { include: { class: true } } },
  });

  if (!appointment) throw new BookingError("Temujanji tidak dijumpai.", "NOT_FOUND");
  if (teacherId && appointment.student.class.teacherId !== teacherId) {
    throw new BookingError("Tidak dibenarkan.", "FORBIDDEN");
  }

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status },
  });
}

export async function rescheduleAppointment(
  appointmentId: string,
  newSlotId: string,
  teacherId?: string
) {
  return prisma.$transaction(async (tx) => {
    const appointment = await tx.appointment.findUnique({
      where: { id: appointmentId },
      include: { student: { include: { class: true } } },
    });

    if (!appointment) throw new BookingError("Temujanji tidak dijumpai.", "NOT_FOUND");
    if (teacherId && appointment.student.class.teacherId !== teacherId) {
      throw new BookingError("Tidak dibenarkan.", "FORBIDDEN");
    }

    const slot = await tx.teacherSlot.findUnique({
      where: { id: newSlotId },
      include: {
        _count: {
          select: {
            appointments: {
              where: {
                status: { notIn: [AppointmentStatus.CANCELLED, AppointmentStatus.REJECTED] },
                id: { not: appointmentId },
              },
            },
          },
        },
      },
    });

    if (!slot || !slot.isOpen || slot._count.appointments >= slot.maxBookings) {
      throw new BookingError("Slot baru tidak tersedia.", "SLOT_FULL");
    }

    return tx.appointment.update({
      where: { id: appointmentId },
      data: { slotId: newSlotId, status: AppointmentStatus.PENDING },
    });
  });
}

export async function cancelAppointment(appointmentId: string, studentId: string) {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, studentId, status: AppointmentStatus.PENDING },
  });
  if (!appointment) throw new BookingError("Temujanji tidak boleh dibatalkan.", "CANCEL_FAILED");

  return prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED },
  });
}
