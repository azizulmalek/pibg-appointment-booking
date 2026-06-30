import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeachers } from "@/lib/actions/admin";
import { AdminTeachersClient } from "@/components/forms/AdminTeachersClient";

export default async function AdminTeachersPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const teachers = await getTeachers();

  return (
    <StaffLayout role="ADMIN" title="Guru">
      <AdminTeachersClient teachers={teachers} />
    </StaffLayout>
  );
}
