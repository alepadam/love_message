"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EnvelopeModal } from "@/components/EnvelopeModal";
import { ComposeModal } from "@/components/ComposeModal";
import { InviteModal } from "@/components/InviteModal";
import { Toast } from "@/components/Toast";
import { useRole } from "@/lib/role-context";
import { incomingDirection, outgoingDirection } from "@/lib/role";
import type { SpaceResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;
const TOAST_DURATION_MS = 2500;

export function MessageTab() {
  const { role, slug } = useRole();
  const [data, setData] = useState<SpaceResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [showEnvelopeModal, setShowEnvelopeModal] = useState(false);
  const [showComposeModal, setShowComposeModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Tracks which message "version" (id + created_at, so an overwrite
  // counts as a new version even though the row id is often reused by
  // the upsert) we've already auto-popped the envelope for — so a
  // background poll doesn't re-trigger the popup for the same letter,
  // but a genuinely new or overwritten letter does.
  const autoShownKeyRef = useRef<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/space/${slug}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not load this space.");
      }
      setData(body);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Something went wrong.");
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(null), TOAST_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const incoming = data?.messages.find((m) => m.direction === incomingDirection(role));
  const outgoing = data?.messages.find((m) => m.direction === outgoingDirection(role));

  // Auto-open the envelope popup for a genuinely new unread letter —
  // but only once per distinct version of it, so it doesn't reappear
  // on every 5-second poll.
  useEffect(() => {
    if (!incoming || incoming.opened_at) return;
    const key = `${incoming.id}-${incoming.created_at}`;
    if (autoShownKeyRef.current === key) return;
    autoShownKeyRef.current = key;
    setShowEnvelopeModal(true);
  }, [incoming]);

  async function handleOpened(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}/open`, { method: "PATCH" });
    } catch {
      // Non-fatal — the letter is already visually open for this visit;
      // worst case it shows the reveal animation again next time.
    }
  }

  async function handleComposerSent() {
    await load();
    setShowComposeModal(false);
    setToastMessage("Sent — sealed and waiting for them.");
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mx-auto max-w-sm rounded-sm bg-paper p-8 text-center shadow-xl ring-1 ring-black/5">
          <p className="font-display text-lg text-ink">This link isn&apos;t working.</p>
          <p className="mt-2 font-sans text-sm text-ink-soft">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-sans text-sm text-ink-soft">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-6 py-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowComposeModal(true)}
          className="rounded-sm border border-wax px-4 py-1.5 font-sans text-sm font-medium text-wax transition-colors hover:bg-wax hover:text-paper"
        >
          ✎ Write a letter
        </button>
        <button
          type="button"
          onClick={() => setShowInviteModal(true)}
          className="rounded-sm border border-ink/15 px-4 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          ⛓ Invite
        </button>
      </div>

      {outgoing && (
        <p className="font-sans text-xs text-ink-soft/60">
          {outgoing.opened_at
            ? `Opened ${new Date(outgoing.opened_at).toLocaleString()}`
            : "Not yet opened"}
        </p>
      )}

      {incoming ? (
        incoming.opened_at && (
          <button
            type="button"
            onClick={() => setShowEnvelopeModal(true)}
            className="font-sans text-sm text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
          >
            View their letter again
          </button>
        )
      ) : (
        <p className="text-center font-sans text-sm text-ink-soft">
          No letter here yet — nothing&apos;s been sent to you.
        </p>
      )}

      {showEnvelopeModal && incoming && (
        <EnvelopeModal
          key={`${incoming.id}-${incoming.created_at}`}
          message={incoming}
          onOpened={handleOpened}
          onClose={() => setShowEnvelopeModal(false)}
        />
      )}

      {showComposeModal && (
        <ComposeModal
          slug={slug}
          direction={outgoingDirection(role)}
          initialContent={outgoing?.content ?? ""}
          onClose={() => setShowComposeModal(false)}
          onSent={handleComposerSent}
        />
      )}

      {showInviteModal && (
        <InviteModal slug={slug} onClose={() => setShowInviteModal(false)} />
      )}

      <Toast message={toastMessage} />
    </div>
  );
}
