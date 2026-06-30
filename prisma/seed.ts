import "dotenv/config";
import bcrypt from "bcryptjs";
import { AppointmentReason, AppointmentStatus } from "@prisma/client";
import { birthCertStorageFields } from "../lib/birth-cert";
import { prisma } from "../lib/prisma";

const CLASS_NAMES = ["Bestari", "Cemerlang", "Gigih", "Jaya"] as const;
const TARGET_YEARS = [4, 5, 6] as const;
const TOTAL_STUDENTS = 200;
const APPOINTMENT_RATE = 0.8;
const AUGUST_YEAR = 2026;
const SLOT_TIMES = ["09:00", "10:00", "11:00", "14:00"] as const;

const FIRST_NAMES = [
  "Ahmad",
  "Siti",
  "Muhammad",
  "Nur",
  "Adam",
  "Aisyah",
  "Hafiz",
  "Farah",
  "Danish",
  "Hannah",
  "Irfan",
  "Balqis",
  "Amir",
  "Sarah",
  "Zikri",
  "Aina",
  "Hakim",
  "Nadia",
  "Luqman",
  "Syafiqah",
];

const LAST_NAMES = [
  "bin Abdullah",
  "binti Hassan",
  "bin Ismail",
  "binti Rahman",
  "bin Omar",
  "binti Aziz",
  "bin Yusof",
  "binti Kamal",
  "bin Zainal",
  "binti Faizal",
];

const TEACHER_NAMES = [
  "Cikgu Siti Aminah",
  "Cikgu Ahmad Rizal",
  "Cikgu Nurul Izzah",
  "Cikgu Hafizuddin",
  "Cikgu Farah Liyana",
  "Cikgu Mohd Zaki",
  "Cikgu Aina Sofea",
  "Cikgu Khairul Anuar",
  "Cikgu Balqis Humaira",
  "Cikgu Syafiq Idris",
  "Cikgu Nadia Zulaikha",
  "Cikgu Amirul Hakim",
];

const SUBJECTS = [
  "Bahasa Melayu",
  "Matematik",
  "Sains",
  "Bahasa Inggeris",
  "Pendidikan Islam",
  "Sejarah",
  "Geografi",
  "Pendidikan Seni",
  "Pendidikan Jasmani",
  "Muzik",
  "Reka Bentuk",
  "Kemahiran Hidup",
];

const STATUSES: AppointmentStatus[] = [
  "APPROVED",
  "APPROVED",
  "APPROVED",
  "APPROVED",
  "APPROVED",
  "PENDING",
  "PENDING",
  "PENDING",
  "REJECTED",
  "REJECTED",
  "RESCHEDULED",
  "CANCELLED",
];

const REASONS: AppointmentReason[] = [
  "GENERAL",
  "GENERAL",
  "GENERAL",
  "GENERAL",
  "MIDTERM",
  "MIDTERM",
  "MIDTERM",
  "FINAL",
  "FINAL",
];

function augustWeekdays(year: number): Date[] {
  const dates: Date[] = [];
  for (let day = 1; day <= 31; day++) {
    const date = new Date(year, 7, day);
    if (date.getMonth() !== 7) break;
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) dates.push(date);
  }
  return dates;
}

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

/** Deterministic 12-digit IC for seed data (YYMMDD + sequence). */
function makeBirthCert(yearLevel: number, index: number): string {
  const birthYear = 2026 - yearLevel - 6;
  const yy = String(birthYear).slice(-2);
  const mm = pad((index % 12) + 1);
  const dd = pad((index % 28) + 1);
  const seq = pad(1000 + index, 4);
  return `${yy}${mm}${dd}10${seq}`;
}

function studentCountsPerClass(total: number, classCount: number): number[] {
  const base = Math.floor(total / classCount);
  const remainder = total % classCount;
  return Array.from({ length: classCount }, (_, i) => base + (i < remainder ? 1 : 0));
}

async function main() {
  await prisma.appointment.deleteMany();
  await prisma.teacherSlot.deleteMany();
  await prisma.student.deleteMany();
  await prisma.class.deleteMany();
  await prisma.teacher.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.blackoutDate.deleteMany();
  await prisma.verificationAttempt.deleteMany();
  await prisma.user.deleteMany();
  await prisma.academicSession.deleteMany();
  await prisma.schoolYearLevel.deleteMany();

  const yearLevels = await Promise.all(
    [1, 2, 3, 4, 5, 6].map((level) =>
      prisma.schoolYearLevel.create({
        data: { level, labelBm: `Tahun ${level}` },
      })
    )
  );

  const session = await prisma.academicSession.create({
    data: {
      label: "2026/2027",
      isActive: true,
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-12-31"),
    },
  });

  const adminHash = await bcrypt.hash("admin123", 10);
  const teacherHash = await bcrypt.hash("guru123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@skkementah.edu.my",
      passwordHash: adminHash,
      role: "ADMIN",
      name: "Admin PIBG",
      phone: "0123456789",
    },
  });

  const countsPerYear = studentCountsPerClass(TOTAL_STUDENTS, TARGET_YEARS.length);
  const countsPerClassInYear = countsPerYear.map((yearTotal) =>
    studentCountsPerClass(yearTotal, CLASS_NAMES.length)
  );

  const allStudents: Array<{ id: string; classId: string; teacherId: string; name: string }> = [];
  const teacherSlotMap = new Map<string, string[]>();
  let teacherIndex = 0;
  let studentNoCounter = 1001;
  let icCounter = 1;

  const augustDays = augustWeekdays(AUGUST_YEAR);

  for (let yi = 0; yi < TARGET_YEARS.length; yi++) {
    const yearLevel = TARGET_YEARS[yi];
    const yearLevelRecord = yearLevels.find((y) => y.level === yearLevel)!;

    for (let ci = 0; ci < CLASS_NAMES.length; ci++) {
      const className = CLASS_NAMES[ci];
      const classSize = countsPerClassInYear[yi][ci];
      const teacherName = TEACHER_NAMES[teacherIndex];
      const email =
        teacherIndex === 0
          ? "guru@skkementah.edu.my"
          : `guru${teacherIndex + 1}@skkementah.edu.my`;

      const teacherUser = await prisma.user.create({
        data: {
          email,
          passwordHash: teacherHash,
          role: "TEACHER",
          name: teacherName,
          phone: `01${pad(90000000 + teacherIndex, 8)}`,
        },
      });

      const teacher = await prisma.teacher.create({
        data: {
          userId: teacherUser.id,
          staffNo: `GURU${pad(teacherIndex + 1, 3)}`,
          subject: SUBJECTS[teacherIndex % SUBJECTS.length],
        },
      });

      const kelas = await prisma.class.create({
        data: {
          sessionId: session.id,
          yearLevelId: yearLevelRecord.id,
          name: className,
          teacherId: teacher.id,
        },
      });

      const slotIds: string[] = [];
      for (const day of augustDays) {
        for (const startTime of SLOT_TIMES) {
          const slot = await prisma.teacherSlot.create({
            data: {
              teacherId: teacher.id,
              date: new Date(day.getFullYear(), day.getMonth(), day.getDate()),
              startTime,
              isOpen: true,
            },
          });
          slotIds.push(slot.id);
        }
      }
      teacherSlotMap.set(teacher.id, slotIds);

      for (let si = 0; si < classSize; si++) {
        const first = FIRST_NAMES[(studentNoCounter + si) % FIRST_NAMES.length];
        const last = LAST_NAMES[(studentNoCounter + si) % LAST_NAMES.length];
        const name = `${first} ${last}`;
        const ic = makeBirthCert(yearLevel, icCounter++);
        const fields = birthCertStorageFields(ic);

        const student = await prisma.student.create({
          data: {
            studentNo: `SKK${studentNoCounter++}`,
            birthCertLookup: fields.birthCertLookup,
            birthCertEncrypted: fields.birthCertEncrypted,
            name,
            classId: kelas.id,
            sessionId: session.id,
          },
        });

        allStudents.push({
          id: student.id,
          classId: kelas.id,
          teacherId: teacher.id,
          name,
        });
      }

      teacherIndex++;
    }
  }

  const appointmentTarget = Math.round(TOTAL_STUDENTS * APPOINTMENT_RATE);
  const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
  const studentsWithAppointments = shuffled.slice(0, appointmentTarget);

  const availableSlotsByTeacher = new Map<string, string[]>();
  for (const [teacherId, slotIds] of teacherSlotMap) {
    availableSlotsByTeacher.set(teacherId, [...slotIds]);
  }

  let refCounter = 1;

  for (let i = 0; i < studentsWithAppointments.length; i++) {
    const student = studentsWithAppointments[i];
    const slots = availableSlotsByTeacher.get(student.teacherId) ?? [];
    if (!slots.length) continue;

    const slotId = slots.shift()!;
    availableSlotsByTeacher.set(student.teacherId, slots);

    const status = STATUSES[i % STATUSES.length];
    const reason = REASONS[i % REASONS.length];
    const parentFirst = student.name.split(" ")[0];

    await prisma.appointment.create({
      data: {
        studentId: student.id,
        slotId,
        sessionId: session.id,
        parentName: `Encik ${parentFirst}`,
        parentPhone: `01${pad(20000000 + i, 8)}`,
        referenceNo: `PIBG-${AUGUST_YEAR}-${pad(refCounter++, 5)}`,
        reason,
        status,
        bookedAt: new Date(AUGUST_YEAR, 6, 1 + (i % 30)),
      },
    });
  }

  await prisma.blackoutDate.create({
    data: {
      startDate: new Date("2026-03-15"),
      endDate: new Date("2026-03-23"),
      title: "Cuti Sekolah",
      createdBy: admin.id,
    },
  });

  const appointmentCount = await prisma.appointment.count();
  const studentCount = await prisma.student.count();
  const classCount = await prisma.class.count();
  const teacherCount = await prisma.teacher.count();

  console.log("Seed complete!");
  console.log(`Students: ${studentCount} | Classes: ${classCount} | Teachers: ${teacherCount}`);
  console.log(
    `Appointments: ${appointmentCount} (${Math.round((appointmentCount / studentCount) * 100)}% of students, target ${APPOINTMENT_RATE * 100}%)`
  );
  console.log("Admin: admin@skkementah.edu.my / admin123");
  console.log("Teachers: guru@skkementah.edu.my … guru12@skkementah.edu.my / guru123");
  console.log("Sample parent IC (Tahun 4):", makeBirthCert(4, 1).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3"));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
