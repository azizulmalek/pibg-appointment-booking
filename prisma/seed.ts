import "dotenv/config";
import bcrypt from "bcryptjs";
import { AppointmentReason, AppointmentStatus } from "@prisma/client";
import { birthCertStorageFields } from "../lib/birth-cert";
import { prisma } from "../lib/prisma";

const CLASS_NAMES = ["Bestari", "Cemerlang", "Gigih", "Jaya"] as const;
const TARGET_YEARS = [1, 2, 3, 4, 5, 6] as const;
const STUDENTS_PER_CLASS = 40;
const APPOINTMENT_RATE = 0.8;
const MIDTERM_DATE_SHARE = 0.3;
const BOOKING_YEAR = 2026;
const SLOT_TIMES = ["09:00", "10:00", "11:00", "14:00"] as const;

const MALE_FIRST_NAMES = [
  "Ahmad",
  "Muhammad",
  "Adam",
  "Hafiz",
  "Danish",
  "Irfan",
  "Amir",
  "Zikri",
  "Hakim",
  "Luqman",
  "Arif",
  "Faris",
  "Haziq",
  "Iman",
  "Johan",
  "Kamal",
  "Luthfi",
  "Mikail",
  "Nabil",
  "Omar",
  "Putera",
  "Qayyum",
  "Rafi",
  "Syafiq",
  "Taufik",
  "Umar",
  "Wafi",
  "Yusri",
  "Zulfikar",
  "Aqil",
  "Badrul",
  "Chandra",
  "Dani",
  "Ehsan",
  "Fadhil",
  "Ghazi",
  "Harith",
  "Idris",
  "Jamil",
  "Khairul",
];

const FEMALE_FIRST_NAMES = [
  "Siti",
  "Nur",
  "Aisyah",
  "Farah",
  "Hannah",
  "Balqis",
  "Sarah",
  "Aina",
  "Nadia",
  "Syafiqah",
  "Alia",
  "Batrisyia",
  "Cahaya",
  "Dania",
  "Elina",
  "Fatin",
  "Gabriela",
  "Hana",
  "Insyirah",
  "Jasmine",
  "Khadijah",
  "Liyana",
  "Maisarah",
  "Nabila",
  "Qistina",
  "Raihana",
  "Sofea",
  "Tasnim",
  "Ummi",
  "Wardah",
  "Yasmin",
  "Zara",
  "Adiba",
  "Balkis",
  "Damia",
  "Elyssa",
  "Fiqah",
  "Humaira",
  "Irdina",
  "Jannah",
];

const PATRONYMICS = [
  "Abdullah",
  "Hassan",
  "Ismail",
  "Rahman",
  "Omar",
  "Aziz",
  "Yusof",
  "Kamal",
  "Zainal",
  "Faizal",
  "Ibrahim",
  "Mahmud",
  "Salleh",
  "Hamid",
  "Rosli",
  "Karim",
  "Halim",
  "Nasir",
  "Latif",
  "Sharif",
  "Anuar",
  "Razak",
  "Hashim",
  "Jamal",
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
  "Cikgu Intan Safiyyah",
  "Cikgu Firdaus Imran",
  "Cikgu Hazwani Azman",
  "Cikgu Luqman Hakim",
  "Cikgu Syahirah Omar",
  "Cikgu Izzuddin Rahman",
  "Cikgu Maisarah Latif",
  "Cikgu Harith Zulkifli",
  "Cikgu Qistina Afiqah",
  "Cikgu Danish Irfan",
  "Cikgu Wardah Salleh",
  "Cikgu Arif Kamaluddin",
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

function pad(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function dateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function weekdaysBetween(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (cursor <= last) {
    if (isWeekday(cursor)) {
      dates.push(new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate()));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function isMidtermCluster(date: Date): boolean {
  return (
    date.getFullYear() === BOOKING_YEAR &&
    date.getMonth() === 6 &&
    date.getDate() >= 5 &&
    date.getDate() <= 10 &&
    isWeekday(date)
  );
}

/** Deterministic unique Malay name for each student (960 combinations). */
function uniqueStudentName(seq: number): string {
  const isMale = seq % 2 === 0;
  const comboIndex = Math.floor(seq / 2);
  const pool = isMale ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES;
  const first = pool[comboIndex % pool.length];
  const patronymic = PATRONYMICS[Math.floor(comboIndex / pool.length) % PATRONYMICS.length];
  return `${first} ${isMale ? "bin" : "binti"} ${patronymic}`;
}

/** Deterministic unique 12-digit birth cert (YYMMDD + sequence). */
function makeBirthCert(yearLevel: number, index: number): string {
  const birthYear = 2026 - yearLevel - 6;
  const yy = String(birthYear).slice(-2);
  const mm = pad((index % 12) + 1);
  const dd = pad((index % 28) + 1);
  const seq = pad(1000 + index, 4);
  return `${yy}${mm}${dd}10${seq}`;
}

function pickAppointmentDate(
  index: number,
  total: number,
  midtermDates: Date[],
  otherDates: Date[]
): Date {
  const midtermCount = Math.round(total * MIDTERM_DATE_SHARE);
  if (index < midtermCount) {
    return midtermDates[index % midtermDates.length];
  }
  const offset = index - midtermCount;
  return otherDates[offset % otherDates.length];
}

function pickAppointmentReason(date: Date): AppointmentReason {
  if (isMidtermCluster(date)) return "MIDTERM";
  if (date.getMonth() === 7 && date.getDate() >= 15) return "FINAL";
  return "GENERAL";
}

/** Teachers process earlier bookings; late-August backlog stays mostly pending. */
function pickAppointmentStatus(date: Date, seed: number): AppointmentStatus {
  const month = date.getMonth();
  const day = date.getDate();

  if (month === 7 && day >= 22) {
    const roll = seed % 100;
    if (roll < 78) return "PENDING";
    if (roll < 90) return "APPROVED";
    if (roll < 96) return "REJECTED";
    return roll % 2 === 0 ? "RESCHEDULED" : "CANCELLED";
  }

  if (month === 7 && day >= 15) {
    const roll = seed % 100;
    if (roll < 45) return "PENDING";
    if (roll < 82) return "APPROVED";
    if (roll < 92) return "REJECTED";
    return roll % 2 === 0 ? "RESCHEDULED" : "CANCELLED";
  }

  const roll = seed % 100;
  if (roll < 62) return "APPROVED";
  if (roll < 78) return "PENDING";
  if (roll < 88) return "REJECTED";
  if (roll < 94) return "RESCHEDULED";
  return "CANCELLED";
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
    TARGET_YEARS.map((level) =>
      prisma.schoolYearLevel.create({
        data: { level, labelBm: `Tahun ${level}` },
      })
    )
  );

  const session = await prisma.academicSession.create({
    data: {
      label: String(BOOKING_YEAR),
      isActive: true,
      startDate: new Date(BOOKING_YEAR, 0, 1),
      endDate: new Date(BOOKING_YEAR, 11, 31),
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

  const bookingStart = new Date(BOOKING_YEAR, 6, 1);
  const bookingEnd = new Date(BOOKING_YEAR, 7, 30);
  const allBookingDays = weekdaysBetween(bookingStart, bookingEnd);
  const midtermDates = allBookingDays.filter(isMidtermCluster);
  const otherBookingDays = allBookingDays.filter((d) => !isMidtermCluster(d));

  const allStudents: Array<{ id: string; teacherId: string; name: string }> = [];
  const slotsByTeacherDate = new Map<string, Map<string, string[]>>();
  let teacherIndex = 0;
  let studentNoCounter = 1001;
  let nameSeq = 0;
  let icCounter = 1;

  for (const yearLevel of TARGET_YEARS) {
    const yearLevelRecord = yearLevels.find((y) => y.level === yearLevel)!;

    for (const className of CLASS_NAMES) {
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

      const dateSlotMap = new Map<string, string[]>();
      for (const day of allBookingDays) {
        const key = dateKey(day);
        const slotIds: string[] = [];
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
        dateSlotMap.set(key, slotIds);
      }
      slotsByTeacherDate.set(teacher.id, dateSlotMap);

      for (let si = 0; si < STUDENTS_PER_CLASS; si++) {
        const name = uniqueStudentName(nameSeq++);
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
          teacherId: teacher.id,
          name,
        });
      }

      teacherIndex++;
    }
  }

  const totalStudents = allStudents.length;
  const appointmentTarget = Math.round(totalStudents * APPOINTMENT_RATE);
  const shuffled = [...allStudents].sort(() => Math.random() - 0.5);
  const studentsWithAppointments = shuffled.slice(0, appointmentTarget);

  let refCounter = 1;
  let midtermAssigned = 0;

  for (let i = 0; i < studentsWithAppointments.length; i++) {
    const student = studentsWithAppointments[i];
    const preferredDate = pickAppointmentDate(
      i,
      studentsWithAppointments.length,
      midtermDates,
      otherBookingDays
    );

    const teacherSlots = slotsByTeacherDate.get(student.teacherId);
    if (!teacherSlots) continue;

    const preferredKey = dateKey(preferredDate);
    const fallbackDates = [
      preferredDate,
      ...allBookingDays.filter((d) => dateKey(d) !== preferredKey),
    ];

    let slotId: string | undefined;
    let bookedDate = preferredDate;
    for (const day of fallbackDates) {
      const key = dateKey(day);
      const dateSlots = teacherSlots.get(key);
      if (dateSlots?.length) {
        slotId = dateSlots.shift();
        bookedDate = day;
        break;
      }
    }
    if (!slotId) continue;
    if (isMidtermCluster(bookedDate)) midtermAssigned++;

    const status = pickAppointmentStatus(bookedDate, i);
    const reason = pickAppointmentReason(bookedDate);
    const parentFirst = student.name.split(" ")[0];

    await prisma.appointment.create({
      data: {
        studentId: student.id,
        slotId,
        sessionId: session.id,
        parentName: `Encik/Puan ${parentFirst}`,
        parentPhone: `01${pad(20000000 + i, 8)}`,
        referenceNo: `PIBG-${BOOKING_YEAR}-${pad(refCounter++, 5)}`,
        reason,
        status,
        bookedAt: new Date(
          bookedDate.getFullYear(),
          bookedDate.getMonth(),
          bookedDate.getDate() - 3
        ),
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
  const pendingLateAug = await prisma.appointment.count({
    where: {
      status: "PENDING",
      slot: {
        date: {
          gte: new Date(BOOKING_YEAR, 7, 22),
          lte: new Date(BOOKING_YEAR, 7, 30),
        },
      },
    },
  });
  const lateAugTotal = await prisma.appointment.count({
    where: {
      slot: {
        date: {
          gte: new Date(BOOKING_YEAR, 7, 22),
          lte: new Date(BOOKING_YEAR, 7, 30),
        },
      },
    },
  });

  console.log("Seed complete!");
  console.log(`Students: ${studentCount} | Classes: ${classCount} | Teachers: ${teacherCount}`);
  console.log(
    `Appointments: ${appointmentCount} (${Math.round((appointmentCount / studentCount) * 100)}% of students, target ${APPOINTMENT_RATE * 100}%)`
  );
  console.log(
    `Mid-term cluster (5–10 Jul): ${midtermAssigned} bookings (${Math.round((midtermAssigned / appointmentCount) * 100)}%)`
  );
  console.log(
    `Late August pending: ${pendingLateAug}/${lateAugTotal} (${lateAugTotal ? Math.round((pendingLateAug / lateAugTotal) * 100) : 0}% of Aug 22–30 bookings)`
  );
  console.log("Admin: admin@skkementah.edu.my / admin123");
  console.log(`Teachers: guru@skkementah.edu.my … guru${teacherCount}@skkementah.edu.my / guru123`);
  console.log(
    "Sample birth cert (Tahun 1):",
    makeBirthCert(1, 1).replace(/(\d{6})(\d{2})(\d{4})/, "$1-$2-$3")
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
