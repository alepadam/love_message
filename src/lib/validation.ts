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
