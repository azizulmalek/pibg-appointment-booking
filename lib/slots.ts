import { prisma } from "./prisma";
import { startOfDay, endOfDay, eachDayOfInterval, getDay, parseISO } from "date-fns";
import { SLOT_TIMES } from "./constants";

export function isWeekday(date: Date): boolean {
  const day = getDay(date);
  return day !== 0 && day !== 6;
}

export function getWeekdayDates(start: Date, end: Date): Date[] {
  return eachDayOfInterval({ start, end }).filter(isWeekday);
}

export async function upsertTeacherSlot(
  teacherId: string,
  date: Date,
  startTime: string,
  isOpen: boolean
) {
  const day = startOfDay(date);
  return prisma.teacherSlot.upsert({
    where: {
      teacherId_date_startTime: {
        teacherId,
        date: day,
        startTime,
      },
    },
    create: { teacherId, date: day, startTime, isOpen },
    update: { isOpen },
  });
}

export async function applyDailySlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  startTime: string,
  isOpen = true
) {
  const dates = getWeekdayDates(startOfDay(startDate), startOfDay(endDate));
  for (const date of dates) {
    await upsertTeacherSlot(teacherId, date, startTime, isOpen);
  }
  return dates.length;
}

export async function applyWeeklySlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  weekday: number,
  startTime: string,
  isOpen = true
) {
  const dates = getWeekdayDates(startOfDay(startDate), startOfDay(endDate)).filter(
    (d) => getDay(d) === weekday
  );
  for (const date of dates) {
    await upsertTeacherSlot(teacherId, date, startTime, isOpen);
  }
  return dates.length;
}

/** Open multiple time slots on one weekday (Mon–Fri) across a date range. */
export async function applyWeekdayBulkSlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  weekday: number,
  startTimes: string[],
  isOpen = true
) {
  const dates = getWeekdayDates(startOfDay(startDate), startOfDay(endDate)).filter(
    (d) => getDay(d) === weekday
  );
  let count = 0;
  for (const date of dates) {
    for (const startTime of startTimes) {
      await upsertTeacherSlot(teacherId, date, startTime, isOpen);
      count++;
    }
  }
  return count;
}

/** Open per-weekday time selections across a date range (weekly pattern). */
export async function applyMultiWeekdayBulkSlots(
  teacherId: string,
  startDate: Date,
  endDate: Date,
  schedule: Record<number, string[]>,
  isOpen = true
) {
  const dates = getWeekdayDates(startOfDay(startDate), startOfDay(endDate));
  let count = 0;
  for (const date of dates) {
    const weekday = getDay(date);
    const times = schedule[weekday];
    if (!times?.length) continue;
    for (const startTime of times) {
      await upsertTeacherSlot(teacherId, date, startTime, isOpen);
      count++;
    }
  }
  return count;
}

export async function getSlotsForTeacherDate(teacherId: string, date: Date) {
  const day = startOfDay(date);
  const existing = await prisma.teacherSlot.findMany({
    where: { teacherId, date: day },
    include: { _count: { select: { appointments: true } } },
  });

  return SLOT_TIMES.map((startTime) => {
    const slot = existing.find((s) => s.startTime === startTime);
    return {
      startTime,
      slotId: slot?.id,
      isOpen: slot?.isOpen ?? false,
      maxBookings: slot?.maxBookings ?? 1,
      booked: slot?._count.appointments ?? 0,
      available: Boolean(
        slot?.isOpen && (slot._count.appointments ?? 0) < (slot.maxBookings ?? 1)
      ),
    };
  });
}

export async function isDateBlackedOut(date: Date): Promise<{ blocked: boolean; title?: string }> {
  const day = startOfDay(date);
  const blackout = await prisma.blackoutDate.findFirst({
    where: {
      startDate: { lte: day },
      endDate: { gte: day },
    },
  });
  return blackout ? { blocked: true, title: blackout.title } : { blocked: false };
}

export function parseDateInput(value: string): Date {
  return startOfDay(parseISO(value));
}

export { startOfDay, endOfDay };
