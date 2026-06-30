import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeachers, getSessions, getAllStudents } from "@/lib/actions/admin";
import { AdminStudentsClient } from "@/components/forms/AdminStudentsClient";

export default async function AdminStudentsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const [teachers, sessions, students] = await Promise.all([
    getTeachers(),
    getSessions(),
    getAllStudents(),
  ]);

  return (
    <StaffLayout role="ADMIN" title="Murid">
      <AdminStudentsClient teachers={teachers} sessions={sessions} students={students} />
    </StaffLayout>
  );
}
