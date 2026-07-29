import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleCode } from "@/lib/pairing-code";
import { pairingRedeemLimiter, getClientIp } from "@/lib/ratelimit";

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { success } = await pairingRedeemLimiter.limit(ip);
  if (!success) {
    return NextResponse.json(
      { error: "Too many attempts. Please wait a few minutes and try again." },
      { status: 429 }
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { code } = body;
  if (!code || !isPlausibleCode(code)) {
    return NextResponse.json({ error: "That code doesn't look right." }, { status: 400 });
  }

  const { data: pairingRow, error: lookupError } = await supabaseAdmin
    .from("pairing_codes")
    .select("id, space_id, expires_at, redeemed_at")
    .eq("code", code)
    .maybeSingle();

  // Deliberately the same generic error for "not found", "expired", and
  // "already used" — distinguishing them for an unauthenticated caller
  // would help someone probing codes narrow down which ones are real.
  const genericError = "That code is invalid or has expired.";

  if (lookupError || !pairingRow) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }
  if (pairingRow.redeemed_at) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }
  if (new Date(pairingRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  // Atomically claim it: the .is("redeemed_at", null) filter means a
  // concurrent redeem attempt on the same code can't both succeed —
  // only the first update actually matches a row.
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from("pairing_codes")
    .update({ redeemed_at: new Date().toISOString() })
    .eq("id", pairingRow.id)
    .is("redeemed_at", null)
    .select("space_id")
    .maybeSingle();

  if (claimError || !claimed) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  const { data: space, error: spaceError } = await supabaseAdmin
    .from("spaces")
    .select("slug")
    .eq("id", claimed.space_id)
    .maybeSingle();

  if (spaceError || !space) {
    return NextResponse.json({ error: genericError }, { status: 400 });
  }

  return NextResponse.json({ slug: space.slug });
}
