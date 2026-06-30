import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getBlackouts } from "@/lib/actions/admin";
import { AdminBlackoutsClient } from "@/components/forms/AdminBlackoutsClient";

export default async function AdminBlackoutsPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const blackouts = await getBlackouts();

  return (
    <StaffLayout role="ADMIN" title="Sekatan Tempahan">
      <AdminBlackoutsClient blackouts={blackouts} />
    </StaffLayout>
  );
}
