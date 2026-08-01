import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { journalLookupLimiter, getClientIp } from "@/lib/ratelimit";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — plenty for a page view

// Simple cap rather than real pagination for this first version — see
// README "Known limitations" for the cursor-pagination note. Fine for
// how many letters two people realistically exchange; would need
// revisiting for a very long-running journal.
const MAX_ENTRIES = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const ip = getClientIp(request);
  const { success } = await journalLookupLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 }
    );
  }

  const { slug } = await params;
  if (!isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: space, error: spaceError } = await supabaseAdmin
    .from("spaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: entries, error: entriesError } = await supabaseAdmin
    .from("journal_entries")
    .select("id, direction, content, attachment_path, attachment_type, created_at")
    .eq("space_id", space.id)
    .order("created_at", { ascending: true })
    .limit(MAX_ENTRIES);

  if (entriesError) {
    console.error("Failed to load journal entries:", entriesError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const entryIds = (entries ?? []).map((entry) => entry.id);
  const { data: decorations, error: decorationsError } =
    entryIds.length > 0
      ? await supabaseAdmin
          .from("journal_decorations")
          .select("id, entry_id, emoji, x, y, created_by, created_at")
          .in("entry_id", entryIds)
      : { data: [], error: null };

  if (decorationsError) {
    // Non-fatal: entries still display without their stickers rather
    // than failing the whole journal load over a decorations issue.
    console.error("Failed to load decorations:", decorationsError);
  }

  const decorationsByEntry = new Map<string, typeof decorations>();
  for (const decoration of decorations ?? []) {
    const list = decorationsByEntry.get(decoration.entry_id) ?? [];
    list.push(decoration);
    decorationsByEntry.set(decoration.entry_id, list);
  }

  const withSignedUrls = await Promise.all(
    (entries ?? []).map(async (entry) => {
      const entryDecorations = (decorationsByEntry.get(entry.id) ?? []).map(
        ({ entry_id: _entryId, ...rest }) => rest
      );

      if (!entry.attachment_path) {
        return { ...entry, attachment_url: null, decorations: entryDecorations };
      }
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(entry.attachment_path, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        console.error("Failed to sign journal attachment URL:", signError);
        return { ...entry, attachment_url: null, decorations: entryDecorations };
      }
      return {
        ...entry,
        attachment_url: signed.signedUrl,
        decorations: entryDecorations,
      };
    })
  );

  return NextResponse.json({ slug, entries: withSignedUrls });
}
