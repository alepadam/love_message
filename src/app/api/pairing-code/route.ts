import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { generatePairingCode } from "@/lib/pairing-code";
import { writeLimiter } from "@/lib/ratelimit";

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5; // retry on the astronomically unlikely code collision

export async function POST(request: Request) {
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

  // Generating a code requires already knowing the slug, so this reuses
  // the message write limiter's per-space budget rather than a
  // separate resource.
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

  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const code = generatePairingCode();
    const { data, error } = await supabaseAdmin
      .from("pairing_codes")
      .insert({ space_id: space.id, code, expires_at: expiresAt })
      .select("code, expires_at")
      .single();

    if (!error && data) {
      return NextResponse.json(
        { code: data.code, expiresAt: data.expires_at },
        { status: 201 }
      );
    }

    // 23505 = unique_violation on the code column — only case worth
    // retrying (a fresh random code will almost certainly not collide).
    if (error && error.code !== "23505") {
      console.error("Failed to create pairing code:", error);
      return NextResponse.json(
        { error: "Could not create a code right now. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique code. Please try again." },
    { status: 500 }
  );
}
