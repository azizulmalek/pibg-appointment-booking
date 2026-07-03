"use client";

import { formatBirthCertDisplay, normalizeBirthCert } from "@/lib/birth-cert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function BirthCertInput({
  name = "birthCert",
  defaultValue = "",
  id = "birthCert",
}: {
  name?: string;
  defaultValue?: string;
  id?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>No. Sijil Lahir</Label>
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        placeholder="XXXXXX-XX-XXXX"
        inputMode="numeric"
        autoComplete="off"
        className="text-center text-lg tracking-wide"
        onBlur={(e) => {
          const n = normalizeBirthCert(e.target.value);
          if (n.length === 12) e.target.value = formatBirthCertDisplay(n);
        }}
      />
      <p className="text-center text-xs text-slate-500">
        Boleh masukkan dengan atau tanpa tanda &quot;-&quot;
      </p>
    </div>
  );
}
