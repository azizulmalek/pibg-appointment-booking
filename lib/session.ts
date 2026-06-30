import { prisma } from "./prisma";
import type { AcademicSession } from "@prisma/client";

/** Calendar year used to group and roll over academic sessions automatically. */
export function currentAcademicYear(): number {
  return new Date().getFullYear();
}

function sessionYear(session: AcademicSession): number {
  return session.startDate.getFullYear();
}

function sessionLabelForYear(year: number): string {
  return String(year);
}

/**
 * Ensures the active session matches the current calendar year.
 * When the year changes, previous sessions are deactivated (archived) and a new empty session is activated.
 */
export async function getActiveAcademicSession(): Promise<AcademicSession> {
  const year = currentAcademicYear();

  const active = await prisma.academicSession.findFirst({ where: { isActive: true } });
  if (active && sessionYear(active) >= year) {
    return active;
  }

  await prisma.academicSession.updateMany({ data: { isActive: false } });

  const label = sessionLabelForYear(year);
  const existing = await prisma.academicSession.findUnique({ where: { label } });

  if (existing) {
    return prisma.academicSession.update({
      where: { id: existing.id },
      data: { isActive: true },
    });
  }

  return prisma.academicSession.create({
    data: {
      label,
      startDate: new Date(year, 0, 1),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999),
      isActive: true,
    },
  });
}
