"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { JournalCover, JournalPage } from "@/components/JournalPage";
import { StickerPalette } from "@/components/StickerPalette";
import { useRole } from "@/lib/role-context";
import { outgoingDirection } from "@/lib/role";
import type { ClientDecoration, ClientJournalEntry, JournalResponse } from "@/lib/types";

// react-pageflip manipulates the DOM directly on mount and isn't
// SSR-safe, so it's loaded client-side only.
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

const BOOK_WIDTH = 340;
const BOOK_HEIGHT = 460;

// react-pageflip's TypeScript definitions mark every one of these as
// required (no optional fields), even though sensible defaults exist
// at runtime — so all of them are supplied explicitly here rather than
// reaching for an `any` cast to work around it.
const BASE_FLIP_BOOK_SETTINGS = {
  size: "fixed" as const,
  width: BOOK_WIDTH,
  height: BOOK_HEIGHT,
  minWidth: BOOK_WIDTH,
  maxWidth: BOOK_WIDTH,
  minHeight: BOOK_HEIGHT,
  maxHeight: BOOK_HEIGHT,
  startPage: 0,
  drawShadow: true,
  flippingTime: 500,
  usePortrait: true,
  startZIndex: 0,
  autoSize: false,
  maxShadowOpacity: 0.5,
  showCover: true,
  mobileScrollSupport: false,
  clickEventForward: true,
  useMouseEvents: true,
  swipeDistance: 30,
  showPageCorners: true,
};

// The library's own types leave the ref as `any` (see
// node_modules/react-pageflip/build/html-flip-book/index.d.ts), so
// there's no more precise type available to use here.
type FlipBookHandle = {
  pageFlip: () => { flipNext: () => void; flipPrev: () => void };
} | null;

export function JournalTab() {
  const { role, slug } = useRole();
  const [data, setData] = useState<JournalResponse | null>(null);
  const [entries, setEntries] = useState<ClientJournalEntry[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stickerError, setStickerError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
  const [decorateMode, setDecorateMode] = useState(false);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const bookRef = useRef<FlipBookHandle>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/journal/${slug}`);
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not load the journal.");
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

  // Journal doesn't poll (unlike Message), so once entries are synced
  // from a load, local sticker edits are the source of truth until the
  // next explicit reload — no background refresh will clobber them.
  useEffect(() => {
    if (data) setEntries(data.entries);
  }, [data]);

  function setEntryDecorations(
    entryId: string,
    updater: (decorations: ClientDecoration[]) => ClientDecoration[]
  ) {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === entryId
          ? { ...entry, decorations: updater(entry.decorations) }
          : entry
      )
    );
  }

  async function handlePlaceSticker(entryId: string, x: number, y: number) {
    if (!selectedSticker) return;
    setStickerError(null);
    const tempId = `temp-${Date.now()}`;
    const optimistic: ClientDecoration = {
      id: tempId,
      emoji: selectedSticker,
      x,
      y,
      created_by: role,
      created_at: new Date().toISOString(),
    };
    setEntryDecorations(entryId, (list) => [...list, optimistic]);

    try {
      const response = await fetch("/api/decorations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          entryId,
          emoji: selectedSticker,
          x,
          y,
          role,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not place the sticker.");
      }
      setEntryDecorations(entryId, (list) =>
        list.map((decoration) =>
          decoration.id === tempId ? body.decoration : decoration
        )
      );
    } catch (error) {
      setEntryDecorations(entryId, (list) =>
        list.filter((decoration) => decoration.id !== tempId)
      );
      setStickerError(
        error instanceof Error ? error.message : "Could not place the sticker."
      );
    }
  }

  function handleMoveStickerLocally(entryId: string, decorationId: string, x: number, y: number) {
    setEntryDecorations(entryId, (list) =>
      list.map((decoration) =>
        decoration.id === decorationId ? { ...decoration, x, y } : decoration
      )
    );
  }

  async function handleMoveStickerEnd(
    entryId: string,
    decorationId: string,
    x: number,
    y: number
  ) {
    // Skip persisting a drag on a sticker that hasn't been saved yet
    // (still has its optimistic temp id) — the create request in
    // handlePlaceSticker already carries its real starting position.
    if (decorationId.startsWith("temp-")) return;

    setStickerError(null);
    try {
      const response = await fetch(`/api/decorations/${decorationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, x, y }),
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error ?? "Could not move the sticker.");
      }
    } catch (error) {
      setStickerError(
        error instanceof Error ? error.message : "Could not move the sticker."
      );
      // Reload to resync with the server's actual last-saved position,
      // since the optimistic local position may now be wrong.
      load();
    }
  }

  async function handleDeleteSticker(entryId: string, decorationId: string) {
    setStickerError(null);
    const previous = entries.find((entry) => entry.id === entryId)?.decorations ?? [];
    setEntryDecorations(entryId, (list) =>
      list.filter((decoration) => decoration.id !== decorationId)
    );

    if (decorationId.startsWith("temp-")) return; // never persisted, nothing to delete server-side

    try {
      const response = await fetch(`/api/decorations/${decorationId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Could not remove the sticker.");
      }
    } catch (error) {
      setEntryDecorations(entryId, () => previous); // roll back on failure
      setStickerError(
        error instanceof Error ? error.message : "Could not remove the sticker."
      );
    }
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mx-auto max-w-sm rounded-sm bg-paper p-8 text-center shadow-xl ring-1 ring-black/5">
          <p className="font-display text-lg text-ink">Couldn&apos;t load the journal.</p>
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

  if (entries.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="font-display text-lg text-ink">
          The journal is empty — for now.
        </p>
        <p className="mt-2 font-sans text-sm text-ink-soft">
          Every letter you send from here on gets a page.
        </p>
      </div>
    );
  }

  const totalPages = entries.length + 2; // + front and back cover
  const mineDirection = outgoingDirection(role);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12">
      <StickerPalette
        decorateMode={decorateMode}
        onToggleDecorateMode={() => {
          setDecorateMode((prev) => !prev);
          setSelectedSticker(null);
        }}
        selectedSticker={selectedSticker}
        onSelectSticker={setSelectedSticker}
      />

      {stickerError && (
        <p className="font-sans text-sm text-wax">{stickerError}</p>
      )}

      <HTMLFlipBook
        {...BASE_FLIP_BOOK_SETTINGS}
        // Disabled while decorating so a tap-to-place or a sticker drag
        // doesn't also get interpreted as a page-flip click.
        disableFlipByClick={decorateMode}
        ref={bookRef}
        className="journal-flipbook"
        style={{}}
        onFlip={(event: { data: number }) => setPageIndex(event.data)}
      >
        <JournalCover title="Our Journal" subtitle="every letter, kept" />
        {entries.map((entry) => (
          <JournalPage
            key={entry.id}
            entry={entry}
            authorLabel={entry.direction === mineDirection ? "you" : "them"}
            decorateMode={decorateMode}
            selectedSticker={selectedSticker}
            onPlaceSticker={handlePlaceSticker}
            onMoveSticker={(decorationId, x, y) =>
              handleMoveStickerLocally(entry.id, decorationId, x, y)
            }
            onMoveStickerEnd={(decorationId, x, y) =>
              handleMoveStickerEnd(entry.id, decorationId, x, y)
            }
            onDeleteSticker={(decorationId) =>
              handleDeleteSticker(entry.id, decorationId)
            }
          />
        ))}
        <JournalCover title="To be continued…" />
      </HTMLFlipBook>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip().flipPrev()}
          className="rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          ← Prev
        </button>
        <p className="font-mono text-xs text-ink-soft/70">
          Page {pageIndex + 1} of {totalPages}
        </p>
        <button
          type="button"
          onClick={() => bookRef.current?.pageFlip().flipNext()}
          className="rounded-sm border border-ink/15 px-3 py-1.5 font-sans text-sm text-ink-soft transition-colors hover:border-wax hover:text-wax"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
