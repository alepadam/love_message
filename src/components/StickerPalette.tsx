"use client";

import { STICKER_PALETTE } from "@/lib/stickers";

interface StickerPaletteProps {
  decorateMode: boolean;
  onToggleDecorateMode: () => void;
  selectedSticker: string | null;
  onSelectSticker: (emoji: string | null) => void;
}

export function StickerPalette({
  decorateMode,
  onToggleDecorateMode,
  selectedSticker,
  onSelectSticker,
}: StickerPaletteProps) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <button
        type="button"
        onClick={onToggleDecorateMode}
        className={`rounded-sm border px-4 py-1.5 font-sans text-sm transition-colors ${
          decorateMode
            ? "border-wax bg-wax text-paper"
            : "border-ink/15 text-ink-soft hover:border-wax hover:text-wax"
        }`}
      >
        {decorateMode ? "Done decorating" : "Decorate"}
      </button>

      {decorateMode && (
        <>
          <div className="flex flex-wrap justify-center gap-2 rounded-sm bg-paper-shade p-3 ring-1 ring-black/5">
            {STICKER_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() =>
                  onSelectSticker(selectedSticker === emoji ? null : emoji)
                }
                aria-pressed={selectedSticker === emoji}
                className={`flex h-9 w-9 items-center justify-center rounded-sm text-xl transition-colors ${
                  selectedSticker === emoji
                    ? "bg-wax/20 ring-1 ring-wax"
                    : "hover:bg-paper"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <p className="text-center font-sans text-xs text-ink-soft/70">
            {selectedSticker
              ? "Tap the page to place it. Drag placed stickers to move them, tap the × to remove."
              : "Pick a sticker, then tap the page to place it."}
          </p>
        </>
      )}
    </div>
  );
}
