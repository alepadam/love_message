"use client";

import { forwardRef, useRef, useState } from "react";
import type { ClientDecoration, ClientJournalEntry } from "@/lib/types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

interface DraggableStickerProps {
  decoration: ClientDecoration;
  decorateMode: boolean;
  isSelected: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onSelect: () => void;
  onMove: (x: number, y: number) => void;
  onMoveEnd: (x: number, y: number) => void;
  onDelete: () => void;
}

// A single placed sticker. Only interactive (draggable, deletable)
// while decorateMode is on — otherwise it's just a static emoji, so
// the underlying page-flip gestures aren't interfered with.
function DraggableSticker({
  decoration,
  decorateMode,
  isSelected,
  containerRef,
  onSelect,
  onMove,
  onMoveEnd,
  onDelete,
}: DraggableStickerProps) {
  const draggingRef = useRef(false);

  function handlePointerDown(event: React.PointerEvent<HTMLSpanElement>) {
    if (!decorateMode) return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    onSelect();
  }

  function computePosition(event: React.PointerEvent<HTMLSpanElement>) {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: clamp(((event.clientX - rect.left) / rect.width) * 100, 2, 98),
      y: clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98),
    };
  }

  function handlePointerMove(event: React.PointerEvent<HTMLSpanElement>) {
    if (!draggingRef.current) return;
    const position = computePosition(event);
    if (position) onMove(position.x, position.y);
  }

  function handlePointerUp(event: React.PointerEvent<HTMLSpanElement>) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    const position = computePosition(event) ?? { x: decoration.x, y: decoration.y };
    onMoveEnd(position.x, position.y);
  }

  return (
    <span
      className="absolute -translate-x-1/2 -translate-y-1/2 select-none text-2xl leading-none"
      style={{
        left: `${decoration.x}%`,
        top: `${decoration.y}%`,
        touchAction: "none",
        cursor: decorateMode ? "grab" : "default",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(event) => event.stopPropagation()}
    >
      {decoration.emoji}
      {decorateMode && isSelected && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onDelete();
          }}
          aria-label="Remove sticker"
          className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-wax text-[10px] leading-none text-paper"
        >
          ×
        </button>
      )}
    </span>
  );
}

interface JournalPageProps {
  entry: ClientJournalEntry;
  authorLabel: string;
  decorateMode: boolean;
  selectedSticker: string | null;
  onPlaceSticker: (entryId: string, x: number, y: number) => void;
  onMoveSticker: (decorationId: string, x: number, y: number) => void;
  onMoveStickerEnd: (decorationId: string, x: number, y: number) => void;
  onDeleteSticker: (decorationId: string) => void;
}

export const JournalPage = forwardRef<HTMLDivElement, JournalPageProps>(
  function JournalPage(
    {
      entry,
      authorLabel,
      decorateMode,
      selectedSticker,
      onPlaceSticker,
      onMoveSticker,
      onMoveStickerEnd,
      onDeleteSticker,
    },
    forwardedRef
  ) {
    const localRef = useRef<HTMLDivElement | null>(null);
    const [selectedDecorationId, setSelectedDecorationId] = useState<string | null>(
      null
    );

    // react-pageflip needs its own ref on this element to measure it,
    // but the drag math below also needs a ref on the same element to
    // compute getBoundingClientRect. This merges both onto one node.
    function setRefs(node: HTMLDivElement | null) {
      localRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    }

    function handleBackgroundClick(event: React.MouseEvent<HTMLDivElement>) {
      setSelectedDecorationId(null);
      if (!decorateMode || !selectedSticker) return;
      const rect = localRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 2, 98);
      const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 2, 98);
      onPlaceSticker(entry.id, x, y);
    }

    return (
      <div
        ref={setRefs}
        onClick={handleBackgroundClick}
        className="relative flex h-full w-full flex-col overflow-hidden bg-paper p-6"
      >
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft/60">
          {new Date(entry.created_at).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
          {" — "}
          {authorLabel}
        </p>
        <p className="mt-3 flex-1 overflow-y-auto whitespace-pre-wrap font-display text-base leading-relaxed text-ink">
          {entry.content}
        </p>
        {entry.attachment_url && entry.attachment_type?.startsWith("image/") && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.attachment_url}
            alt="Attached photo"
            className="mt-3 max-h-32 w-full shrink-0 rounded-sm object-cover ring-1 ring-black/10"
          />
        )}
        {entry.attachment_url && entry.attachment_type === "application/pdf" && (
          <a
            href={entry.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="mt-3 shrink-0 font-sans text-xs text-ink-soft underline decoration-ink-soft/40 underline-offset-2 hover:text-ink"
          >
            View attached PDF
          </a>
        )}

        {entry.decorations.map((decoration) => (
          <DraggableSticker
            key={decoration.id}
            decoration={decoration}
            decorateMode={decorateMode}
            isSelected={decoration.id === selectedDecorationId}
            containerRef={localRef}
            onSelect={() => setSelectedDecorationId(decoration.id)}
            onMove={(x, y) => onMoveSticker(decoration.id, x, y)}
            onMoveEnd={(x, y) => onMoveStickerEnd(decoration.id, x, y)}
            onDelete={() => onDeleteSticker(decoration.id)}
          />
        ))}
      </div>
    );
  }
);

interface JournalCoverProps {
  title: string;
  subtitle?: string;
}

export const JournalCover = forwardRef<HTMLDivElement, JournalCoverProps>(
  function JournalCover({ title, subtitle }, ref) {
    return (
      <div
        ref={ref}
        className="flex h-full w-full flex-col items-center justify-center gap-2 bg-wax p-6 text-center"
      >
        <p className="font-display text-2xl italic text-paper">{title}</p>
        {subtitle && (
          <p className="font-sans text-xs text-paper/70">{subtitle}</p>
        )}
      </div>
    );
  }
);
