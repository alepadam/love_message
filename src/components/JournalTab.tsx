"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { JournalCover, JournalPage } from "@/components/JournalPage";
import { useRole } from "@/lib/role-context";
import { outgoingDirection } from "@/lib/role";
import type { JournalResponse } from "@/lib/types";

// react-pageflip manipulates the DOM directly on mount and isn't
// SSR-safe, so it's loaded client-side only.
const HTMLFlipBook = dynamic(() => import("react-pageflip"), { ssr: false });

const BOOK_WIDTH = 340;
const BOOK_HEIGHT = 460;

// react-pageflip's TypeScript definitions mark every one of these as
// required (no optional fields), even though sensible defaults exist
// at runtime — so all of them are supplied explicitly here rather than
// reaching for an `any` cast to work around it.
const FLIP_BOOK_SETTINGS = {
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
  disableFlipByClick: false,
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pageIndex, setPageIndex] = useState(0);
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

  if (data.entries.length === 0) {
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

  const totalPages = data.entries.length + 2; // + front and back cover
  const mineDirection = outgoingDirection(role);

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-6 py-12">
      <HTMLFlipBook
        {...FLIP_BOOK_SETTINGS}
        ref={bookRef}
        className="journal-flipbook"
        style={{}}
        onFlip={(event: { data: number }) => setPageIndex(event.data)}
      >
        <JournalCover title="Our Journal" subtitle="every letter, kept" />
        {data.entries.map((entry) => (
          <JournalPage
            key={entry.id}
            entry={entry}
            authorLabel={entry.direction === mineDirection ? "you" : "them"}
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
