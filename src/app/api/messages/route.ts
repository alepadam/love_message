import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { writeLimiter } from "@/lib/ratelimit";
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
