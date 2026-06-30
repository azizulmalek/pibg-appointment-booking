"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setError(null);
            setLoading(true);
            const fd = new FormData(e.currentTarget);
            const result = await signIn("credentials", {
              email: String(fd.get("email")),
              password: String(fd.get("password")),
              redirect: false,
            });
            setLoading(false);
            if (result?.error) {
              setError("Emel atau kata laluan tidak sah.");
              return;
            }
            const res = await fetch("/api/auth/session");
            const session = await res.json();
            if (session?.user?.role === "ADMIN") router.push("/admin");
            else router.push("/teacher");
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Emel</Label>
            <Input id="email" name="email" type="email" required placeholder="guru@skkementah.edu.my" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Kata Laluan</Label>
            <Input id="password" name="password" type="password" required />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Log masuk..." : "Log Masuk"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
