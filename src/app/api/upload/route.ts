import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase";
import { isPlausibleSlug } from "@/lib/slug";
import { uploadLimiter } from "@/lib/ratelimit";
import { validateAttachment, validateAvatar } from "@/lib/validation";
import { EXTENSION_BY_TYPE } from "@/lib/attachment-types";

export async function POST(request: Request) {
  const formData = await request.formData();
  const slug = formData.get("slug");
  const file = formData.get("file");
  // "attachment" (message attachments: jpeg/png/pdf) or "avatar"
  // (profile photos: jpeg/png only). Defaults to "attachment" so
  // existing callers that don't send this field keep working.
  const purpose = formData.get("purpose") === "avatar" ? "avatar" : "attachment";

  if (typeof slug !== "string" || !isPlausibleSlug(slug)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  const { success } = await uploadLimiter.limit(slug);
  if (!success) {
    return NextResponse.json(
      { error: "Too many uploads. Please wait a moment." },
      { status: 429 }
    );
  }

  const validation =
    purpose === "avatar" ? validateAvatar(file) : validateAttachment(file);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const { data: space, error: spaceError } = await supabaseAdmin
    .from("spaces")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (spaceError || !space) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const extension = EXTENSION_BY_TYPE[file.type];
  const prefix = purpose === "avatar" ? "avatar" : "attachment";
  const path = `${slug}/${prefix}-${nanoid(12)}.${extension}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabaseAdmin.storage
    .from("attachments")
    .upload(path, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    console.error("Failed to upload attachment:", uploadError);
    return NextResponse.json({ error: "Could not upload the file." }, { status: 500 });
  }

  return NextResponse.json({ path, type: file.type }, { status: 201 });
}
