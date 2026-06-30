"use client";

import { useState, useTransition } from "react";
import { BirthCertInput } from "./BirthCertInput";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function VerifyForm({
  action,
  redirectTo,
  submitLabel = "Teruskan",
}: {
  action: (birthCert: string, redirectTo?: string) => Promise<{ error?: string } | void>;
  redirectTo?: string;
  submitLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            const fd = new FormData(e.currentTarget);
            const birthCert = String(fd.get("birthCert"));
            startTransition(async () => {
              const result = await action(birthCert, redirectTo);
              if (result?.error) setError(result.error);
            });
          }}
          className="space-y-6"
        >
          <BirthCertInput />
          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">{error}</p>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={pending}>
            {pending ? "Memproses..." : submitLabel}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
