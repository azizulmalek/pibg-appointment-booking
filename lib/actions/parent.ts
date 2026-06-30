"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  birthCertLookupKey,
  isValidBirthCert,
  normalizeBirthCert,
} from "@/lib/birth-cert";
import { setParentSessionCookie } from "@/lib/parent-session";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

export async function verifyParentAction(birthCertInput: string, redirectTo?: string) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak percubaan. Sila cuba lagi dalam ${rate.retryAfter} saat.`,
    };
  }

  const normalized = normalizeBirthCert(birthCertInput);
  if (!isValidBirthCert(normalized)) {
    return { error: "No. Sijil Lahir tidak dijumpai. Sila semak nombor atau hubungi sekolah." };
  }

  const lookup = birthCertLookupKey(normalized);
  const student = await prisma.student.findFirst({
    where: { birthCertLookup: lookup, session: { isActive: true } },
  });

  if (!student) {
    await prisma.verificationAttempt.create({
      data: { birthCertLookupPrefix: lookup.slice(0, 8), ipAddress: ip },
    });
    return { error: "No. Sijil Lahir tidak dijumpai. Sila semak nombor atau hubungi sekolah." };
  }

  resetRateLimit(ip);
  await setParentSessionCookie({ studentId: student.id });

  if (redirectTo === "appointment") redirect("/book/appointment");
  if (redirectTo === "semak") redirect("/semak/result");
  redirect("/book/appointment");
}

export async function lookupParentAppointments(birthCertInput: string) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak percubaan. Sila cuba lagi dalam ${rate.retryAfter} saat.`,
    };
  }

  const normalized = normalizeBirthCert(birthCertInput);
  if (!isValidBirthCert(normalized)) {
    return { error: "No. Sijil Lahir tidak dijumpai. Sila semak nombor atau hubungi sekolah." };
  }

  const lookup = birthCertLookupKey(normalized);
  const student = await prisma.student.findFirst({
    where: { birthCertLookup: lookup, session: { isActive: true } },
    include: {
      appointments: {
        where: { status: { not: "CANCELLED" } },
        orderBy: { bookedAt: "desc" },
        include: {
          slot: { include: { teacher: { include: { user: true } } } },
        },
      },
      class: { include: { yearLevel: true } },
    },
  });

  if (!student) {
    await prisma.verificationAttempt.create({
      data: { birthCertLookupPrefix: lookup.slice(0, 8), ipAddress: ip },
    });
    return { error: "No. Sijil Lahir tidak dijumpai. Sila semak nombor atau hubungi sekolah." };
  }

  resetRateLimit(ip);
  return { student, appointments: student.appointments };
}
