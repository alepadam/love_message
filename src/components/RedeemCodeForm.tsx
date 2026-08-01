"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setStoredRole } from "@/lib/role";

export function RedeemCodeForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!/^[0-9]{6}$/.test(trimmed)) {
      setError("Enter the 6-digit code exactly as you received it.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/pairing-code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not use that code.");
      }
      // Redeeming a code means joining a space someone else already
      // created, so this device is always the "second person" — this
      // is what lets us skip the manual role picker for this flow.
      setStoredRole(body.slug, "b");
      router.push(`/s/${body.slug}/message`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-xs flex-col items-center gap-2"
    >
      <input
        type="text"
        inputMode="numeric"
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value.replace(/[^0-9]/g, ""))}
        placeholder="6-digit code"
        className="w-full rounded-sm border border-ink/10 bg-white/40 px-3 py-2 text-center font-mono text-lg tracking-[0.2em] text-ink placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-ink-soft/50 focus:border-wax focus:outline-none"
      />
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-sm border border-wax px-4 py-2 font-sans text-sm font-medium text-wax transition-colors hover:bg-wax hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {submitting ? "Joining…" : "Join with code"}
      </button>
      {error && <p className="font-sans text-sm text-wax">{error}</p>}
    </form>
  );
}
