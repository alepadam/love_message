import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { lookupLimiter, getClientIp } from "@/lib/ratelimit";

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
  const { success } = await lookupLimiter.limit(ip);
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

  const withSignedUrls = await Promise.all(
    (entries ?? []).map(async (entry) => {
      if (!entry.attachment_path) {
        return { ...entry, attachment_url: null };
      }
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(entry.attachment_path, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        console.error("Failed to sign journal attachment URL:", signError);
        return { ...entry, attachment_url: null };
      }
      return { ...entry, attachment_url: signed.signedUrl };
    })
  );

  return NextResponse.json({ slug, entries: withSignedUrls });
}
