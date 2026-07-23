import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { writeLimiter } from "@/lib/ratelimit";
import { validateProfileName, validateBirthday } from "@/lib/validation";

interface ProfileBody {
  slug: string;
  role: string;
  name: string;
  birthday?: string | null;
  avatarPath?: string | null;
}

export async function POST(request: Request) {
  let body: ProfileBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { slug, role, name, birthday, avatarPath } = body;

  if (!slug || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  if (role !== "a" && role !== "b") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const nameCheck = validateProfileName(name);
  if (!nameCheck.ok) {
    return NextResponse.json({ error: nameCheck.error }, { status: 400 });
  }

  const birthdayCheck = validateBirthday(birthday ?? null);
  if (!birthdayCheck.ok) {
    return NextResponse.json({ error: birthdayCheck.error }, { status: 400 });
  }

  // Shares the message write limiter's per-space budget rather than a
  // separate Upstash resource — profile edits are infrequent enough
  // that this doesn't meaningfully compete with sending messages.
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

  const { data: existing } = await supabaseAdmin
    .from("profiles")
    .select("avatar_path")
    .eq("space_id", space.id)
    .eq("role", role)
    .maybeSingle();

  const { data: saved, error: upsertError } = await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        space_id: space.id,
        role,
        name: name.trim(),
        birthday: birthday || null,
        avatar_path: avatarPath ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "space_id,role" }
    )
    .select("id, role, name, birthday, avatar_path, updated_at")
    .single();

  if (upsertError || !saved) {
    console.error("Failed to save profile:", upsertError);
    return NextResponse.json({ error: "Could not save the profile." }, { status: 500 });
  }

  const oldAvatar = existing?.avatar_path;
  if (oldAvatar && oldAvatar !== saved.avatar_path) {
    const { error: removeError } = await supabaseAdmin.storage
      .from("attachments")
      .remove([oldAvatar]);
    if (removeError) {
      // Non-fatal: the profile saved successfully; the old file is just
      // orphaned and can be cleaned up later.
      console.error("Failed to remove replaced avatar:", removeError);
    }
  }

  return NextResponse.json({ profile: saved }, { status: 200 });
}
