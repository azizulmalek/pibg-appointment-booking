"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  searchStudentsForParentAction,
  verifyParentAltAction,
  type ParentAltStudentResult,
} from "@/lib/actions/parent-alt";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function VerifyAltForm() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<ParentAltStudentResult[]>([]);
  const [selected, setSelected] = useState<ParentAltStudentResult | null>(null);
  const [last4, setLast4] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (selected) return;

    const q = debouncedQuery.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);

    searchStudentsForParentAction(q).then((res) => {
      if (cancelled) return;
      setSearching(false);
      if ("error" in res) {
        setError(res.error);
        setResults([]);
        return;
      }
      setError(null);
      setResults(res.results);
      setShowResults(true);
    });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, selected]);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const selectStudent = (student: ParentAltStudentResult) => {
    setSelected(student);
    setQuery(student.name);
    setResults([]);
    setShowResults(false);
    setError(null);
    setLast4("");
  };

  const clearSelection = () => {
    setSelected(null);
    setQuery("");
    setLast4("");
    setResults([]);
    setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) {
      setError("Sila pilih nama anak anda daripada senarai carian.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await verifyParentAltAction(selected.id, last4);
      if (result?.error) setError(result.error);
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div ref={containerRef} className="relative space-y-2">
            <Label htmlFor="studentSearch">Nama Anak</Label>
            <Input
              id="studentSearch"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (selected && e.target.value !== selected.name) {
                  setSelected(null);
                  setLast4("");
                }
                setShowResults(true);
              }}
              onFocus={() => {
                if (!selected && results.length > 0) setShowResults(true);
              }}
              placeholder="Contoh: Ahmad bin Ali"
              autoComplete="off"
              disabled={pending}
            />
            <p className="text-xs text-slate-500">
              Mula menaip nama anak — pilih daripada cadangan yang muncul.
            </p>

            {showResults && !selected && (searching || results.length > 0) && (
              <ul
                className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                role="listbox"
              >
                {searching && (
                  <li className="px-4 py-3 text-sm text-slate-500">Mencari...</li>
                )}
                {!searching &&
                  results.map((student) => (
                    <li key={student.id} role="option">
                      <button
                        type="button"
                        className={cn(
                          "w-full px-4 py-3 text-left text-sm hover:bg-teal-50",
                          "focus-visible:bg-teal-50 focus-visible:outline-none"
                        )}
                        onClick={() => selectStudent(student)}
                      >
                        <span className="font-medium text-slate-900">{student.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {student.classLabel}
                        </span>
                      </button>
                    </li>
                  ))}
              </ul>
            )}

            {showResults && !selected && !searching && debouncedQuery.trim().length >= 2 && results.length === 0 && (
              <p className="text-sm text-slate-500">Tiada murid dijumpai. Cuba ejaan lain.</p>
            )}
          </div>

          {selected && (
            <div className="rounded-xl border border-teal-100 bg-teal-50/50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{selected.name}</p>
                  <p className="text-xs text-slate-500">{selected.classLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 text-xs text-teal-700 hover:underline"
                >
                  Tukar
                </button>
              </div>
            </div>
          )}

          {selected && (
            <div className="space-y-2">
              <Label htmlFor="birthCertLast4">4 Digit Terakhir No. Sijil Lahir</Label>
              <Input
                id="birthCertLast4"
                value={last4}
                onChange={(e) => setLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="XXXX"
                inputMode="numeric"
                autoComplete="off"
                className="text-center text-lg tracking-[0.3em]"
                maxLength={4}
                disabled={pending}
              />
              <p className="text-center text-xs text-slate-500">
                Contoh: untuk XXXXXX-XX-<strong>XXXX</strong>, masukkan <strong>XXXX</strong>
              </p>
            </div>
          )}

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={pending || !selected || last4.length !== 4}
          >
            {pending ? "Memproses..." : "Teruskan"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
