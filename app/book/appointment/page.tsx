import { redirect } from "next/navigation";
import { ParentShell } from "@/components/layout/ParentShell";
import { BookingClient } from "@/components/forms/BookingClient";
import { getStudentBookingContext, getMonthCalendarData } from "@/lib/actions/booking";

export default async function BookAppointmentPage() {
  const student = await getStudentBookingContext();
  if (!student) redirect("/book");

  if (student.appointments.length > 0) {
    return (
      <ParentShell title="Tempahan Aktif" subtitle="Anda sudah mempunyai temujanji">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
          Murid ini sudah mempunyai temujanji aktif. Sila semak status di{" "}
          <a href="/semak" className="font-medium underline">
            Semak Tempahan
          </a>
          .
        </div>
      </ParentShell>
    );
  }

  const now = new Date();
  const calendar = await getMonthCalendarData(now.getFullYear(), now.getMonth());

  const calendarData = calendar
    ? {
        slots: calendar.slots,
        blackouts: calendar.blackouts.map((b) => ({
          startDate: new Date(b.startDate),
          endDate: new Date(b.endDate),
          title: b.title,
        })),
      }
    : null;

  return (
    <ParentShell title="Pilih Tarikh & Masa" subtitle="Langkah terakhir untuk tempahan anda">
      <BookingClient student={student} initialCalendar={calendarData} />
    </ParentShell>
  );
}
