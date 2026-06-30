"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, Clock, Shield } from "lucide-react";
import { SchoolLogo } from "@/components/layout/SchoolLogo";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

const teacherLinks = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/appointments", label: "Temujanji", icon: Calendar },
  { href: "/teacher/slots", label: "Aturan Slot", icon: Clock },
  { href: "/teacher/class", label: "Senarai Murid", icon: Users },
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
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-5 dark:border-slate-800">
        <SchoolLogo size={36} className="h-9 w-9 shrink-0" />
        <div>
          <p className="text-sm font-semibold dark:text-slate-100">SK Kementah</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{role === "ADMIN" ? "Admin" : "Guru"}</p>
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
                active
                  ? "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
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
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      <StaffSidebar role={role} />
      <div className="flex-1">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-8 py-5 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
          </div>
          <ThemeToggle />
        </header>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
}
