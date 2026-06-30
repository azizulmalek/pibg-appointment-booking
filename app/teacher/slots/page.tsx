import { redirect } from "next/navigation";
import { format } from "date-fns";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeacherSlotsForDate } from "@/lib/actions/teacher";
import { TeacherSlotsClient } from "@/components/forms/TeacherSlotsClient";

export default async function TeacherSlotsPage() {
  const session = await auth();
  if (!session?.user.teacherId) redirect("/login");

  const today = format(new Date(), "yyyy-MM-dd");
  const slots = await getTeacherSlotsForDate(session.user.teacherId, today);

  return (
    <StaffLayout role="TEACHER" title="Slot">
      <TeacherSlotsClient
        initialDate={today}
        initialSlots={slots.map((s) => ({
          id: s.slotId ?? s.startTime,
          startTime: s.startTime,
          isOpen: s.isOpen,
          booked: s.booked,
          maxBookings: s.maxBookings,
        }))}
      />
    </StaffLayout>
  );
}
