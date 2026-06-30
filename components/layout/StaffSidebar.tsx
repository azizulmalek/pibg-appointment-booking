"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, Clock, Shield } from "lucide-react";
import { SchoolLogo } from "@/components/layout/SchoolLogo";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const teacherLinks = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/class", label: "Kelas", icon: Users },
  { href: "/teacher/slots", label: "Slot", icon: Clock },
  { href: "/teacher/appointments", label: "Temujanji", icon: Calendar },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/teachers", label: "Guru", icon: Users },
  { href: "/admin/students", label: "Murid", icon: Users },
  { href: "/admin/blackouts", label: "Sekatan", icon: Calendar },
  { href: "/admin/monitor", label: "Monitor", icon: Shield },
];

export function StaffSidebar({ role }: { role: "TEACHER" | "ADMIN" }) {
  const pathname = usePathname();
  const links = role === "ADMIN" ? adminLinks : teacherLinks;

  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5">
        <SchoolLogo size={36} className="h-9 w-9 shrink-0" />
        <div>
          <p className="text-sm font-semibold">SK Kementah</p>
          <p className="text-xs text-slate-500">{role === "ADMIN" ? "Admin" : "Guru"}</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href || (link.href !== "/teacher" && link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "bg-teal-50 text-teal-800" : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
          Log Keluar
        </Button>
      </div>
    </aside>
  );
}

export function StaffLayout({
  children,
  role,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  role: "TEACHER" | "ADMIN";
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <StaffSidebar role={role} />
      <div className="flex-1">
        <header className="border-b border-slate-200 bg-white px-8 py-5">
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
        </header>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
