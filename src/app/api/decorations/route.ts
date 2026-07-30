import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { writeLimiter } from "@/lib/ratelimit";
import {
  isValidSticker,
  isValidCoordinate,
  MAX_DECORATIONS_PER_ENTRY,
} from "@/lib/stickers";

interface DecorationBody {
  slug: string;
  entryId: string;
  emoji: string;
  x: number;
  y: number;
  role: string;
}

export async function POST(request: Request) {
  let body: DecorationBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, entryId, emoji, x, y, role } = body;

  if (!slug || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (role !== "a" && role !== "b") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }
  if (!isValidSticker(emoji)) {
    return NextResponse.json({ error: "Not a valid sticker." }, { status: 400 });
  }
  if (!isValidCoordinate(x) || !isValidCoordinate(y)) {
    return NextResponse.json({ error: "Invalid sticker position." }, { status: 400 });
  }
  if (typeof entryId !== "string" || entryId.length === 0) {
    return NextResponse.json({ error: "Invalid entry." }, { status: 400 });
  }

  const { success } = await writeLimiter.limit(slug);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
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

  // entryId comes from the client, so this confirms the entry actually
  // belongs to the space identified by the given slug before attaching
  // anything to it — otherwise a caller who knew an entry id from a
  // different space (an unguessable UUID, but still) could decorate it.
  const { data: entry, error: entryError } = await supabaseAdmin
    .from("journal_entries")
    .select("id, space_id")
    .eq("id", entryId)
    .maybeSingle();

  if (entryError || !entry || entry.space_id !== space.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { count, error: countError } = await supabaseAdmin
    .from("journal_decorations")
    .select("id", { count: "exact", head: true })
    .eq("entry_id", entryId);

  if (countError) {
    console.error("Failed to count decorations:", countError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
  if ((count ?? 0) >= MAX_DECORATIONS_PER_ENTRY) {
    return NextResponse.json(
      { error: "This page already has the maximum number of stickers." },
      { status: 400 }
    );
  }

  const { data: saved, error: insertError } = await supabaseAdmin
    .from("journal_decorations")
    .insert({ entry_id: entryId, emoji, x, y, created_by: role })
    .select("id, emoji, x, y, created_by, created_at")
    .single();

  if (insertError || !saved) {
    console.error("Failed to save decoration:", insertError);
    return NextResponse.json({ error: "Could not place the sticker." }, { status: 500 });
  }

  return NextResponse.json({ decoration: saved }, { status: 201 });
}
