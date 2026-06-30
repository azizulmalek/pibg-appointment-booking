import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getMonitorData } from "@/lib/actions/admin";
import { AdminMonitorClient } from "@/components/forms/AdminMonitorClient";

export default async function AdminMonitorPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const data = await getMonitorData();

  return (
    <StaffLayout role="ADMIN" title="Monitor">
      <AdminMonitorClient data={data} />
    </StaffLayout>
  );
}
