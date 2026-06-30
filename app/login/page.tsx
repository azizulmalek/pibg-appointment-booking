import Link from "next/link";
import { ParentShell } from "@/components/layout/ParentShell";
import { LoginForm } from "@/components/forms/LoginForm";

export default function LoginPage() {
  return (
    <ParentShell title="Log Masuk" subtitle="Untuk guru dan pentadbir sahaja">
      <LoginForm />
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link href="/" className="hover:text-teal-700">
          ← Kembali ke laman utama
        </Link>
      </p>
    </ParentShell>
  );
}
