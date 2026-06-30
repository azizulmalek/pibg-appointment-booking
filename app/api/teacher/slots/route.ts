import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTeacherSlotsForDate } from "@/lib/actions/teacher";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user.teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ slots: [] });

  const slots = await getTeacherSlotsForDate(session.user.teacherId, date);
  return NextResponse.json({
    slots: slots.map((s) => ({
      id: s.slotId ?? s.startTime,
      startTime: s.startTime,
      isOpen: s.isOpen,
      booked: s.booked,
      maxBookings: s.maxBookings,
    })),
  });
}
