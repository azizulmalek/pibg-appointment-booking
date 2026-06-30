import Link from "next/link";
import { SchoolLogo } from "@/components/layout/SchoolLogo";

export function ParentShell({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-4">
          <SchoolLogo size={40} className="h-10 w-10 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900">SK Kementah · PIBG</p>
            <p className="text-xs text-slate-500">Sistem Temujanji Ibu Bapa & Guru</p>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-8">
        {title && (
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
          </div>
        )}
        {children}
      </main>
      <footer className="border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
        <Link href="/" className="hover:text-teal-700">
          Laman Utama
        </Link>
        {" · "}
        <Link href="/semak" className="hover:text-teal-700">
          Semak Tempahan
        </Link>
      </footer>
    </div>
  );
}
