"use client";

import { useCallback, useEffect, useState } from "react";
import { Envelope } from "@/components/Envelope";
import { MessageComposer } from "@/components/MessageComposer";
import { RolePicker } from "@/components/RolePicker";
import {
  getStoredRole,
  incomingDirection,
  outgoingDirection,
  setStoredRole,
  type Role,
} from "@/lib/role";
import type { SpaceResponse } from "@/lib/types";

interface SpaceViewProps {
  slug: string;
}

const POLL_INTERVAL_MS = 5000;

export function SpaceView({ slug }: SpaceViewProps) {
  const [role, setRole] = useState<Role | null>(null);
  const [roleResolved, setRoleResolved] = useState(false);
  const [data, setData] = useState<SpaceResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setRole(getStoredRole(slug));
    setRoleResolved(true);
  }, [slug]);

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
  // your own sent letter update without a manual page refresh. Only runs
  // once a role is picked, since there's nothing to poll for before that.
  useEffect(() => {
    if (!role) return;
    const interval = window.setInterval(load, POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [role, load]);

  function handlePickRole(picked: Role) {
    setStoredRole(slug, picked);
    setRole(picked);
  }

  async function handleOpened(messageId: string) {
    try {
      await fetch(`/api/messages/${messageId}/open`, { method: "PATCH" });
    } catch {
      // Non-fatal — the letter is already visually open for this visit;
      // worst case it shows the reveal animation again next time.
    }
  }

  if (!roleResolved) {
    return null;
  }

  if (!role) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <RolePicker onPick={handlePickRole} />
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-sm rounded-sm bg-paper p-8 text-center shadow-xl ring-1 ring-black/5">
          <p className="font-display text-lg text-ink">This link isn&apos;t working.</p>
          <p className="mt-2 font-sans text-sm text-ink-soft">{loadError}</p>
        </div>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="font-sans text-sm text-ink-soft">Loading…</p>
      </main>
    );
  }

  const incoming = data.messages.find((m) => m.direction === incomingDirection(role));
  const outgoing = data.messages.find((m) => m.direction === outgoingDirection(role));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-10 px-6 py-16">
      <header className="text-center">
        <p className="font-display text-sm italic text-ink-soft">a sealed space for the two of you</p>
      </header>

      {incoming ? (
        // Keyed by message id: without this, overwriting the incoming
        // message would keep the old Envelope instance mounted, so its
        // "already opened" state would incorrectly carry over to the new
        // message instead of resealing it.
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
    </main>
  );
}