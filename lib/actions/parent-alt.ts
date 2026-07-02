"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isValidBirthCertLast4, verifyBirthCertLast4 } from "@/lib/birth-cert";
import { setParentSessionCookie } from "@/lib/parent-session";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";

const MIN_SEARCH_LENGTH = 2;
const MAX_SEARCH_RESULTS = 8;

export type ParentAltStudentResult = {
  id: string;
  name: string;
  classLabel: string;
};

const MISMATCH_ERROR =
  "Maklumat tidak sepadan. Sila semak semula atau hubungi sekolah.";

async function getClientIp() {
  const headersList = await headers();
  return headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function searchStudentsForParentAction(
  query: string
): Promise<{ results: ParentAltStudentResult[] } | { error: string }> {
  const ip = await getClientIp();
  const rate = checkRateLimit(`search:${ip}`);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak carian. Sila cuba lagi dalam ${rate.retryAfter} saat.`,
    };
  }

  const trimmed = query.trim();
  if (trimmed.length < MIN_SEARCH_LENGTH) {
    return { results: [] };
  }

  if (/\d/.test(trimmed)) {
    return { results: [] };
  }

  const students = await prisma.student.findMany({
    where: {
      session: { isActive: true },
      name: { contains: trimmed },
    },
    include: {
      class: { include: { yearLevel: true } },
    },
    orderBy: { name: "asc" },
    take: MAX_SEARCH_RESULTS,
  });

  return {
    results: students.map((s) => ({
      id: s.id,
      name: s.name,
      classLabel: `${s.class.yearLevel.labelBm} ${s.class.name}`,
    })),
  };
}

export async function verifyParentAltAction(studentId: string, last4Input: string) {
  const ip = await getClientIp();
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return {
      error: `Terlalu banyak percubaan. Sila cuba lagi dalam ${rate.retryAfter} saat.`,
    };
  }

  if (!studentId?.trim()) {
    return { error: MISMATCH_ERROR };
  }

  if (!isValidBirthCertLast4(last4Input)) {
    return { error: MISMATCH_ERROR };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, session: { isActive: true } },
  });

  if (!student || !verifyBirthCertLast4(student.birthCertEncrypted, last4Input)) {
    await prisma.verificationAttempt.create({
      data: {
        birthCertLookupPrefix: `alt:${studentId.slice(0, 8)}`,
        ipAddress: ip,
      },
    });
    return { error: MISMATCH_ERROR };
  }

  resetRateLimit(ip);
  await setParentSessionCookie({ studentId: student.id });
  redirect("/book-alt/appointment");
}
