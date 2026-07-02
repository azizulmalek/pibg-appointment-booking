import { ParentShell } from "@/components/layout/ParentShell";
import { VerifyAltForm } from "@/components/forms/VerifyAltForm";

export default function BookAltPage() {
  return (
    <ParentShell
      title="Tempah Temujanji"
      subtitle="Cari nama anak anda, kemudian sahkan 4 digit terakhir No. Sijil Lahir"
    >
      <p className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-100 px-4 py-2 text-center text-xs text-slate-600">
        Halaman percubaan —{" "}
        <a href="/book" className="font-medium text-teal-700 hover:underline">
          gunakan halaman biasa
        </a>{" "}
        jika lebih selesa.
      </p>
      <VerifyAltForm />
    </ParentShell>
  );
}
