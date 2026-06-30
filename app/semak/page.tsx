import { ParentShell } from "@/components/layout/ParentShell";
import { SemakForm } from "@/components/forms/SemakForm";

export default function SemakPage() {
  return (
    <ParentShell title="Semak Tempahan" subtitle="Masukkan No. Sijil Lahir untuk melihat status">
      <SemakForm />
    </ParentShell>
  );
}
