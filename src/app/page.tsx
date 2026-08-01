"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RedeemCodeForm } from "@/components/RedeemCodeForm";
import { setStoredRole } from "@/lib/role";

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/space", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not create a space.");
      }
      // Whoever clicks "Create" is always the first person — this is
      // what lets us skip the manual role picker for this flow. The
      // link/code to invite the second person now lives behind the
      // Invite button inside the app itself, generated on demand,
      // rather than shown once here and easily lost.
      setStoredRole(body.slug, "a");
      router.push(`/s/${body.slug}/message`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCreating(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-10 px-6 py-16 text-center">
      <div className="max-w-md">
        <h1 className="font-display text-4xl italic text-ink">Sealed</h1>
        <p className="mt-4 font-sans text-base text-ink-soft">
          A private space for the two of you. Leave a letter, attach a photo
          or a PDF, and it&apos;ll be waiting — sealed — the next time they
          open the link.
        </p>
      </div>

      <button
        type="button"
        onClick={handleCreate}
        disabled={creating}
        className="rounded-sm bg-wax px-6 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-wax-dark disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? "Creating…" : "Create a private space"}
      </button>

      {error && <p className="font-sans text-sm text-wax">{error}</p>}

      <div className="flex w-full max-w-xs flex-col items-center gap-3 border-t border-ink/10 pt-8">
        <p className="font-sans text-sm text-ink-soft">
          Received a code from someone?
        </p>
        <RedeemCodeForm />
      </div>
    </main>
  );
}
