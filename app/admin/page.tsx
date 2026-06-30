import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { StaffLayout } from "@/components/layout/StaffSidebar";
import { getAdminDashboard } from "@/lib/actions/admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReasonBarChart, BookingHeatmap } from "@/components/charts/DashboardCharts";
import { format } from "date-fns";

export default async function AdminDashboardPage() {
  const session = await auth();
  if (session?.user.role !== "ADMIN") redirect("/login");

  const data = await getAdminDashboard();
  if (!data) {
    return (
      <StaffLayout role="ADMIN" title="Dashboard">
        <p className="text-slate-500">Tiada sesi akademik aktif.</p>
      </StaffLayout>
    );
  }

  return (
    <StaffLayout role="ADMIN" title="Dashboard">
      <p className="mb-6 text-sm text-slate-500">Sesi {data.session.label}</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Guru", value: data.teachers },
          { label: "Murid", value: data.students },
          { label: "Temujanji (sesi)", value: data.appointments },
          { label: "Hari Ini", value: data.todayAppts },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-6">
              <p className="text-sm text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-3xl font-semibold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Temujanji Mengikut Sebab</CardTitle>
          </CardHeader>
          <CardContent>
            <ReasonBarChart data={data.reasonData} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tempahan Terkini (28 hari)</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingHeatmap data={data.heatmap} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Murid Mengikut Tahun</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.yearBreakdown.map((y) => (
                <li key={y.name} className="flex justify-between border-b py-2">
                  <span>{y.name}</span>
                  <span className="text-slate-400">{y.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Amaran Guru (slot rendah)</CardTitle>
          </CardHeader>
          <CardContent>
            {data.teacherAlerts.length === 0 ? (
              <p className="text-sm text-slate-500">Tiada amaran</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {data.teacherAlerts.map((t) => (
                  <li key={t.name} className="text-amber-700">
                    {t.name} — hanya {t.openSlots} slot dibuka
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sekatan Akan Datang</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.blackouts.map((b) => (
                <li key={b.id}>
                  {format(b.startDate, "d MMM")}–{format(b.endDate, "d MMM yyyy")}: {b.title}
                </li>
              ))}
              {data.blackouts.length === 0 && <li className="text-slate-400">Tiada</li>}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Log Audit Terkini</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-xs text-slate-600">
              {data.auditLogs.map((log) => (
                <li key={log.id}>
                  {format(log.createdAt, "dd/MM HH:mm")} · {log.action} {log.entity}{" "}
                  {log.details && `— ${log.details}`}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </StaffLayout>
  );
}
