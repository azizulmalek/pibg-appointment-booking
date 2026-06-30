import Link from "next/link";
import { format } from "date-fns";
import { ms } from "date-fns/locale";
import { Calendar, Search } from "lucide-react";
import { SchoolLogo } from "@/components/layout/SchoolLogo";
import { getLandingData } from "@/lib/actions/admin";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const { session, blackouts } = await getLandingData();

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-6 py-5">
          <SchoolLogo size={44} className="h-11 w-11 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">SK Kementah</p>
            <p className="text-xs text-slate-500">Persatuan Ibu Bapa dan Guru</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16 text-center">
        {blackouts.length > 0 ? (
          <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {blackouts.map((b) => (
              <p key={b.id}>
                Tempahan ditutup {format(b.startDate, "d MMM", { locale: ms })}–
                {format(b.endDate, "d MMM yyyy", { locale: ms })}: {b.title}
              </p>
            ))}
          </div>
        ) : (
          <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Tempahan dibuka sepanjang tahun
          </div>
        )}

        <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Temujanji Ibu Bapa & Guru
        </h1>
        <p className="mx-auto mt-4 max-w-lg text-lg text-slate-500">
          Tempah sesi perbincangan dengan guru kelas untuk memahami perkembangan anak anda di sekolah.
        </p>
        {session && (
          <p className="mt-2 text-sm text-slate-400">Sesi {session.label}</p>
        )}

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Button asChild size="lg" className="min-w-[200px]">
            <Link href="/book">
              <Calendar className="h-4 w-4" />
              Tempah Temujanji
            </Link>
          </Button>
        </div>

        <div className="mt-6 flex justify-center gap-6 text-sm text-slate-500">
          <Link href="/semak" className="flex items-center gap-1.5 hover:text-teal-700">
            <Search className="h-4 w-4" />
            Semak Tempahan
          </Link>
          <Link href="/login" className="hover:text-teal-700">
            Log Masuk Guru/Admin
          </Link>
        </div>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-8 text-center text-xs text-slate-500">
        <p>PIBG SK Kementah · Hubungi pejabat sekolah untuk bantuan</p>
      </footer>
    </div>
  );
}
