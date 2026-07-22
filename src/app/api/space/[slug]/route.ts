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
    .select("id, slug, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (spaceError) {
    console.error("Failed to look up space:", spaceError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!space) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data: messages, error: messagesError } = await supabaseAdmin
    .from("messages")
    .select(
      "id, direction, content, attachment_path, attachment_type, created_at, opened_at"
    )
    .eq("space_id", space.id);

  if (messagesError) {
    console.error("Failed to load messages:", messagesError);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  const withSignedUrls = await Promise.all(
    (messages ?? []).map(async (message) => {
      if (!message.attachment_path) {
        return { ...message, attachment_url: null };
      }
      const { data: signed, error: signError } = await supabaseAdmin.storage
        .from("attachments")
        .createSignedUrl(message.attachment_path, SIGNED_URL_TTL_SECONDS);

      if (signError) {
        console.error("Failed to sign attachment URL:", signError);
        return { ...message, attachment_url: null };
      }
      return { ...message, attachment_url: signed.signedUrl };
    })
  );

  return NextResponse.json({
    slug: space.slug,
    messages: withSignedUrls,
  });
}
