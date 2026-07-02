import { ParentShell } from "@/components/layout/ParentShell";
import { VerifyForm } from "@/components/forms/VerifyForm";
import { verifyParentAction } from "@/lib/actions/parent";

export const dynamic = "force-dynamic";

export default function BookPage() {
  return (
    <ParentShell
      title="Tempah Temujanji"
      subtitle="Masukkan No. Sijil Lahir anak anda untuk mula"
    >
      <VerifyForm action={verifyParentAction} redirectTo="appointment" />
    </ParentShell>
  );
}
