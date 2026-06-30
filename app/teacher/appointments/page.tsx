import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeacherAppointments, getTeacherOpenSlots } from "@/lib/actions/teacher";
import { TeacherAppointmentsClient } from "@/components/forms/TeacherAppointmentsClient";

export default async function TeacherAppointmentsPage() {
  const session = await auth();
  if (!session?.user.teacherId) redirect("/login");

  const [appointments, openSlotsRaw] = await Promise.all([
    getTeacherAppointments(session.user.teacherId),
    getTeacherOpenSlots(session.user.teacherId),
  ]);

  const openSlots = openSlotsRaw.map((s) => ({
    id: s.id,
    date: s.date,
    startTime: s.startTime,
    booked: s._count.appointments,
    maxBookings: s.maxBookings,
  }));

  return (
    <StaffLayout role="TEACHER" title="Temujanji">
      <TeacherAppointmentsClient appointments={appointments} openSlots={openSlots} />
    </StaffLayout>
  );
}
