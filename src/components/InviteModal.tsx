"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { PairingCodeDisplay } from "@/components/PairingCodeDisplay";

interface InviteModalProps {
  slug: string;
  onClose: () => void;
}

interface PairingCode {
  code: string;
  expiresAt: string;
}

export function InviteModal({ slug, onClose }: InviteModalProps) {
  const [pairingCode, setPairingCode] = useState<PairingCode | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestCode() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not generate a code.");
      }
      setPairingCode({ code: body.code, expiresAt: body.expiresAt });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  // Generate a code the moment the modal opens — no extra click needed.
  useEffect(() => {
    requestCode();
    // Deliberately runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Modal onClose={onClose}>
      <div className="flex flex-col items-center gap-4 rounded-sm bg-paper p-6 text-center shadow-xl">
        <h2 className="font-display text-lg text-ink">Invite them in</h2>
        <p className="font-sans text-sm text-ink-soft">
          Share this code — it works once and expires soon.
        </p>
        {loading && !pairingCode && (
          <p className="font-sans text-sm text-ink-soft">Generating…</p>
        )}
        {error && <p className="font-sans text-sm text-wax">{error}</p>}
        {pairingCode && (
          <PairingCodeDisplay
            code={pairingCode.code}
            expiresAt={pairingCode.expiresAt}
            onRegenerate={requestCode}
            regenerating={loading}
          />
        )}
        <button
          type="button"
          onClick={onClose}
          className="rounded-sm border border-ink/15 px-4 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
