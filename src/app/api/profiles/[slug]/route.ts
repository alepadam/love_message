import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { lookupLimiter, getClientIp } from "@/lib/ratelimit";

const SIGNED_URL_TTL_SECONDS = 60 * 10; // 10 minutes — plenty for a page view

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

  const { data: profiles, error: profilesError } = await supabaseAdmin
    .from("profiles")
    .select("id, role, name, birthday, avatar_path, updated_at")
    .eq("space_id", space.id);

  if (profilesError) {
    console.error("Failed to load profiles:", profilesError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const withSignedUrls = await Promise.all(
    (profiles ?? []).map(async (profile) => {
      if (!profile.avatar_path) {
        return { ...profile, avatar_url: null };
      }
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(profile.avatar_path, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        console.error("Failed to sign avatar URL:", signError);
        return { ...profile, avatar_url: null };
      }
      return { ...profile, avatar_url: signed.signedUrl };
    })
  );

  return NextResponse.json({ slug, profiles: withSignedUrls });
}
