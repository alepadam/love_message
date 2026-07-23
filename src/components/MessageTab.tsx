"use client";

import { useCallback, useEffect, useState } from "react";
import { Envelope } from "@/components/Envelope";
import { MessageComposer } from "@/components/MessageComposer";
import { useRole } from "@/lib/role-context";
import { incomingDirection, outgoingDirection } from "@/lib/role";
import type { SpaceResponse } from "@/lib/types";

const POLL_INTERVAL_MS = 5000;

export function MessageTab() {
  const { role, slug } = useRole();
  const [data, setData] = useState<SpaceResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  // Poll periodically so the incoming letter and the "opened" status on
  // your own sent letter update without a manual page refresh.
  useEffect(() => {
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  async function handleOpened(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}/open`, { method: "PATCH" });
    } catch {
      // Non-fatal — the letter is already visually open for this visit;
      // worst case it shows the reveal animation again next time.
    }
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

  const incoming = data.messages.find((m) => m.direction === incomingDirection(role));
  const outgoing = data.messages.find((m) => m.direction === outgoingDirection(role));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-10 px-6 py-12">
      {incoming ? (
        // Keyed by message id so overwriting the incoming message
        // correctly reseals the envelope instead of carrying over the
        // previous message's "already opened" state.
        <Envelope key={incoming.id} message={incoming} onOpened={handleOpened} />
      ) : (
        <p className="text-center font-sans text-sm text-ink-soft">
          No letter here yet — nothing&apos;s been sent to you.
        </p>
      )}

      <MessageComposer
        slug={slug}
        direction={outgoingDirection(role)}
        initialContent={outgoing?.content ?? ""}
        openedAt={outgoing?.opened_at ?? null}
        hasSentBefore={Boolean(outgoing)}
        onSent={load}
      />
    </div>
  );
}
