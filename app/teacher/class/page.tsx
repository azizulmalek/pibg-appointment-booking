import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeacherClasses } from "@/lib/actions/teacher";
import { TeacherClassClient } from "@/components/forms/TeacherClassClient";

export default async function TeacherClassPage() {
  const session = await auth();
  if (!session?.user.teacherId) redirect("/login");

  const classes = await getTeacherClasses(session.user.teacherId);

  return (
    <StaffLayout role="TEACHER" title="Senarai Murid">
      <TeacherClassClient classes={classes} />
    </StaffLayout>
  );
}
