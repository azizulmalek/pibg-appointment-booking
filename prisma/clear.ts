import "dotenv/config";
import { prisma } from "../lib/prisma";

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

  console.log("All seeded data removed.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
