import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { writeLimiter } from "@/lib/ratelimit";
import { EXTENSION_BY_TYPE } from "@/lib/attachment-types";
import {
  validateMessageContent,
  validateDirection,
} from "@/lib/validation";

interface MessageBody {
  slug: string;
  direction: string;
  content: string;
  attachmentPath?: string | null;
  attachmentType?: string | null;
}

export async function POST(request: Request) {
  let body: MessageBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, direction, content, attachmentPath, attachmentType } = body;

  if (!slug || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const directionCheck = validateDirection(direction);
  if (!directionCheck.ok) {
    return NextResponse.json({ error: directionCheck.error }, { status: 400 });
  }

  const contentCheck = validateMessageContent(content);
  if (!contentCheck.ok) {
    return NextResponse.json({ error: contentCheck.error }, { status: 400 });
  }

  // Rate-limit per space (not per IP) — this is what actually protects
  // the single overwritable message slot from being spammed, regardless
  // of how many IPs a bad actor uses.
  const { success } = await writeLimiter.limit(slug);
  if (!success) {
    return NextResponse.json(
      { error: "Too many messages sent. Please wait a moment." },
      { status: 429 }
    );
  }

  const { data: space, error: spaceError } = await supabaseAdmin
    .from("spaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Capture the previous attachment (if any) so we can delete it from
  // storage after a successful overwrite — otherwise every edit leaks
  // an orphaned file.
  const { data: existing } = await supabaseAdmin
    .from("messages")
    .select("attachment_path")
    .eq("space_id", space.id)
    .eq("direction", direction)
    .maybeSingle();

  const { data: saved, error: upsertError } = await supabaseAdmin
    .from("messages")
    .upsert(
      {
        space_id: space.id,
        direction,
        content: content.trim(),
        attachment_path: attachmentPath ?? null,
        attachment_type: attachmentType ?? null,
        created_at: new Date().toISOString(),
        opened_at: null, // a new message is unread again, even if overwriting
      },
      { onConflict: "space_id,direction" }
    )
    .select("id, direction, content, attachment_path, attachment_type, created_at, opened_at")
    .single();

  if (upsertError || !saved) {
    console.error("Failed to save message:", upsertError);
    return NextResponse.json({ error: "Could not save the message." }, { status: 500 });
  }

  // Archive a permanent copy into the journal. Critically, if there's
  // an attachment, it gets its OWN storage object here (copied, not
  // referenced) — decoupled from the "current message" attachment's
  // lifecycle. Without this, overwriting the message later would
  // delete the attachment out from under this journal entry, breaking
  // the image on that permanent page. The journal entry is append-only
  // and must never be affected by what happens to the current message.
  let journalAttachmentPath: string | null = null;
  if (saved.attachment_path && saved.attachment_type) {
    const extension = EXTENSION_BY_TYPE[saved.attachment_type] ?? "bin";
    const candidatePath = `${slug}/journal-${nanoid(12)}.${extension}`;
    const { error: copyError } = await supabaseAdmin.storage
      .from("attachments")
      .copy(saved.attachment_path, candidatePath);
    if (copyError) {
      // Non-fatal: log it and archive the journal entry without an
      // attachment rather than failing the whole send over this.
      console.error("Failed to copy attachment for journal archive:", copyError);
    } else {
      journalAttachmentPath = candidatePath;
    }
  }

  const { error: journalError } = await supabaseAdmin.from("journal_entries").insert({
    space_id: space.id,
    direction,
    content: saved.content,
    attachment_path: journalAttachmentPath,
    attachment_type: journalAttachmentPath ? saved.attachment_type : null,
  });
  if (journalError) {
    // Non-fatal: the message itself saved successfully — only the
    // permanent journal copy failed. The user's send should not appear
    // to fail when the core "current message" behavior worked.
    console.error("Failed to archive journal entry:", journalError);
  }

  const oldPath = existing?.attachment_path;
  if (oldPath && oldPath !== saved.attachment_path) {
    const { error: removeError } = await supabaseAdmin.storage
      .from("attachments")
      .remove([oldPath]);
    if (removeError) {
      // Non-fatal: the message saved successfully; the old file is just
      // orphaned and can be cleaned up later. Log for visibility.
      console.error("Failed to remove replaced attachment:", removeError);
    }
  }

  return NextResponse.json({ message: saved }, { status: 200 });
}
