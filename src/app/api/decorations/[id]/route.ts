import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { writeLimiter } from "@/lib/ratelimit";
import { isValidCoordinate } from "@/lib/stickers";

// Confirms this decoration's entry actually belongs to the space
// identified by the given slug — the decoration id alone isn't proof
// of ownership, since it's just referenced by the client.
async function verifyOwnership(decorationId: string, slug: string): Promise<boolean> {
  const { data: space } = await supabaseAdmin
    .from("spaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!space) return false;

  const { data: decoration } = await supabaseAdmin
    .from("journal_decorations")
    .select("entry_id")
    .eq("id", decorationId)
    .maybeSingle();
  if (!decoration) return false;

  const { data: entry } = await supabaseAdmin
    .from("journal_entries")
    .select("space_id")
    .eq("id", decoration.entry_id)
    .maybeSingle();
  if (!entry) return false;

  return entry.space_id === space.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { slug?: string; x?: number; y?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, x, y } = body;
  if (!slug || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return NextResponse.json({ error: "Invalid sticker position." }, { status: 400 });
  }

  const { success } = await writeLimiter.limit(slug);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const owns = await verifyOwnership(id, slug);
  if (!owns) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("journal_decorations")
    .update({ x, y })
    .eq("id", id)
    .select("id, emoji, x, y, created_by, created_at")
    .single();

  if (error || !updated) {
    console.error("Failed to update decoration:", error);
    return NextResponse.json({ error: "Could not move the sticker." }, { status: 500 });
  }

  return NextResponse.json({ decoration: updated });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug } = body;
  if (!slug || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { success } = await writeLimiter.limit(slug);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  const owns = await verifyOwnership(id, slug);
  if (!owns) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("journal_decorations")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete decoration:", error);
    return NextResponse.json({ error: "Could not remove the sticker." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
