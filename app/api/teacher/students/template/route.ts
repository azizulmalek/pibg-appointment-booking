import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateClassStudentTemplate } from "@/lib/excel";

export async function GET() {
  const session = await auth();
  if (!session?.user.teacherId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const buffer = generateClassStudentTemplate();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="templat-senarai-murid.xlsx"',
    },
  });
}
