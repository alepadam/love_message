export const MAX_MESSAGE_LENGTH = 4000;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

export const ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type AllowedAttachmentType = (typeof ALLOWED_ATTACHMENT_TYPES)[number];

export function isAllowedAttachmentType(
  type: string
): type is AllowedAttachmentType {
  return (ALLOWED_ATTACHMENT_TYPES as readonly string[]).includes(type);
}

export function maxBytesFor(type: AllowedAttachmentType): number {
  return type === "application/pdf" ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export function validateMessageContent(content: unknown): ValidationResult {
  if (typeof content !== "string") {
    return { ok: false, error: "Message content must be text." };
  }
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Message can't be empty." };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `Message is too long (max ${MAX_MESSAGE_LENGTH} characters).`,
    };
  }
  return { ok: true };
}

export function validateDirection(direction: unknown): ValidationResult {
  if (direction !== "a_to_b" && direction !== "b_to_a") {
    return { ok: false, error: "Invalid message direction." };
  }
  return { ok: true };
}

export function validateAttachment(
  file: File
): ValidationResult {
  if (!isAllowedAttachmentType(file.type)) {
    return {
      ok: false,
      error: "Only JPEG, PNG, or PDF attachments are allowed.",
    };
  }
  const limit = maxBytesFor(file.type);
  if (file.size > limit) {
    return {
      ok: false,
      error: `File is too large (max ${Math.round(limit / (1024 * 1024))}MB for this type).`,
    };
  }
  return { ok: true };
}

export const MAX_NAME_LENGTH = 60;

export function validateProfileName(name: unknown): ValidationResult {
  if (typeof name !== "string") {
    return { ok: false, error: "Name must be text." };
  }
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Name can't be empty." };
  }
  if (trimmed.length > MAX_NAME_LENGTH) {
    return {
      ok: false,
      error: `Name is too long (max ${MAX_NAME_LENGTH} characters).`,
    };
  }
  return { ok: true };
}

// Sanity ceiling only — not a real policy limit — to catch obviously
// wrong input (typos like a 4-digit year off by a century).
const MAX_PLAUSIBLE_AGE_YEARS = 130;

export function validateBirthday(birthday: unknown): ValidationResult {
  if (birthday === null || birthday === undefined || birthday === "") {
    return { ok: true }; // optional field
  }
  if (typeof birthday !== "string") {
    return { ok: false, error: "Birthday is invalid." };
  }
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) {
    return { ok: false, error: "Birthday is invalid." };
  }
  const now = new Date();
  if (date.getTime() > now.getTime()) {
    return { ok: false, error: "Birthday can't be in the future." };
  }
  const earliest = new Date();
  earliest.setFullYear(now.getFullYear() - MAX_PLAUSIBLE_AGE_YEARS);
  if (date.getTime() < earliest.getTime()) {
    return { ok: false, error: "Birthday doesn't look right." };
  }
  return { ok: true };
}

export function validateAvatar(file: File): ValidationResult {
  if (file.type !== "image/jpeg" && file.type !== "image/png") {
    return { ok: false, error: "Profile photo must be a JPEG or PNG image." };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      error: `Image is too large (max ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB).`,
    };
  }
  return { ok: true };
}
