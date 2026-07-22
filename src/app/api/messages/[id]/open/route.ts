import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // maybeSingle + explicit not-found handling instead of trusting a
  // bare update to silently no-op on a bad id.
  const { data: existing } = await supabaseAdmin
    .from("messages")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin
    .from("messages")
    .update({ opened_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, opened_at")
    .single();

  if (error || !data) {
    console.error("Failed to mark message opened:", error);
    return NextResponse.json({ error: "Could not update the message." }, { status: 500 });
  }

  return NextResponse.json({ message: data });
}
