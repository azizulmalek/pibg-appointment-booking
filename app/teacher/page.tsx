import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getTeacherDashboard } from "@/lib/actions/teacher";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppointmentPieChart, ReasonBarChart } from "@/components/charts/DashboardCharts";
import { REASON_LABELS } from "@/lib/constants";

export default async function TeacherDashboardPage() {
  const session = await auth();
  if (!session?.user.teacherId) redirect("/login");

  const greeting = `Hi, ${session.user.name}`;

  const data = await getTeacherDashboard(session.user.teacherId);
  if (!data) {
    return (
      <StaffLayout role="TEACHER" title="Dashboard" subtitle={greeting}>
        <p className="text-slate-500">Tiada sesi akademik aktif.</p>
      </StaffLayout>
    );
  }

  const reasonData = [
    { name: REASON_LABELS.GENERAL, count: data.reasonCounts.GENERAL },
    { name: REASON_LABELS.MIDTERM, count: data.reasonCounts.MIDTERM },
    { name: REASON_LABELS.FINAL, count: data.reasonCounts.FINAL },
  ];

  return (
    <StaffLayout role="TEACHER" title="Dashboard" subtitle={greeting}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Jumlah Murid", value: data.totalStudents },
          { label: "Sudah Tempah", value: data.bookedCount },
          { label: "Menunggu Kelulusan", value: data.pending },
          { label: "Temujanji Hari Ini", value: data.todayAppts },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-3xl font-semibold text-slate-900">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Status Tempahan Murid</CardTitle>
          </CardHeader>
          <CardContent>
            <AppointmentPieChart booked={data.bookedCount} total={data.totalStudents} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Temujanji Mengikut Sebab</CardTitle>
          </CardHeader>
          <CardContent>
            <ReasonBarChart data={reasonData} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sudah Tempah</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.bookedStudents.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-slate-100 py-2">
                  <span>{s.name}</span>
                  <span className="text-slate-400">{s.studentNo}</span>
                </li>
              ))}
              {data.bookedStudents.length === 0 && (
                <li className="text-slate-400">Tiada murid</li>
              )}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Belum Tempah</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.unbookedStudents.map((s) => (
                <li key={s.id} className="flex justify-between border-b border-slate-100 py-2">
                  <span>{s.name}</span>
                  <span className="text-slate-400">{s.studentNo}</span>
                </li>
              ))}
              {data.unbookedStudents.length === 0 && (
                <li className="text-slate-400">Semua murid sudah tempah</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
