"use client";

import { useState } from "react";
import { PairingCodeDisplay } from "@/components/PairingCodeDisplay";
import { RedeemCodeForm } from "@/components/RedeemCodeForm";

interface PairingCode {
  code: string;
  expiresAt: string;
}

export default function HomePage() {
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function requestPairingCode(spaceSlug: string) {
    try {
      const response = await fetch("/api/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: spaceSlug }),
      });
      const body = await response.json();
      if (response.ok) {
        setPairingCode({ code: body.code, expiresAt: body.expiresAt });
      }
      // Non-fatal if this fails — the full link still works as a
      // fallback, so we don't surface an error for the code specifically.
    } catch {
      // Same as above — silently degrade to link-only.
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/space", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not create a space.");
      }
      setSlug(body.slug);
      setLink(`${window.location.origin}/s/${body.slug}`);
      await requestPairingCode(body.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRegenerateCode() {
    if (!slug) return;
    setRegeneratingCode(true);
    await requestPairingCode(slug);
    setRegeneratingCode(false);
  }

  async function handleCopy() {
    if (!link) return;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = link;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy silently failed — the link is still visible and selectable manually.
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

      {!link ? (
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating}
          className="rounded-sm bg-wax px-6 py-3 font-sans text-sm font-medium text-paper transition-colors hover:bg-wax-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {creating ? "Creating…" : "Create a private space"}
        </button>
      ) : (
        <div className="flex w-full max-w-md flex-col items-center gap-4">
          <div className="w-full rounded-sm bg-paper p-6 shadow-xl ring-1 ring-black/5">
            <p className="font-sans text-sm font-medium text-wax">
              Save this link — it&apos;s the only way back in.
            </p>
            <code className="mt-3 block break-all rounded-sm bg-paper-shade p-3 font-mono text-sm text-ink">
              {link}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="mt-3 rounded-sm border border-ink/15 px-4 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>

          {pairingCode && (
            <>
              <p className="font-sans text-xs text-ink-soft/70">
                Or share this code instead — quicker to read out loud, but
                it only works once and expires soon:
              </p>
              <PairingCodeDisplay
                code={pairingCode.code}
                expiresAt={pairingCode.expiresAt}
                onRegenerate={handleRegenerateCode}
                regenerating={regeneratingCode}
              />
            </>
          )}
        </div>
      )}

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
