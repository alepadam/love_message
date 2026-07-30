// A deliberately small, curated palette rather than free-text input —
// keeps journal decorations predictable and avoids arbitrary content
// being submitted through what's meant to be a simple sticker field.
export const STICKER_PALETTE = [
  "❤️",
  "✨",
  "⭐",
  "🌸",
  "🎉",
  "😊",
  "🔥",
  "💌",
  "🌙",
  "☀️",
  "🍀",
  "🎈",
] as const;

export type Sticker = (typeof STICKER_PALETTE)[number];

export function isValidSticker(value: unknown): value is Sticker {
  return (
    typeof value === "string" &&
    (STICKER_PALETTE as readonly string[]).includes(value)
  );
}

export function isValidCoordinate(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 100
  );
}

// Prevents a single page from being spammed with unlimited stickers.
export const MAX_DECORATIONS_PER_ENTRY = 30;
