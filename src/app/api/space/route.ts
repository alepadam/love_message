import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateSlug } from "@/lib/slug";

export async function POST() {
  // Retry a handful of times in the astronomically unlikely event of a
  // slug collision, rather than trusting a single insert to succeed.
  const MAX_ATTEMPTS = 5;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = generateSlug();
    const { data, error } = await supabaseAdmin
      .from("spaces")
      .insert({ slug })
      .select("slug")
      .single();

    if (!error && data) {
      return NextResponse.json({ slug: data.slug }, { status: 201 });
    }

    // 23505 = unique_violation — only case worth retrying on.
    if (error && error.code !== "23505") {
      console.error("Failed to create space:", error);
      return NextResponse.json(
        { error: "Could not create a space right now. Please try again." },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    { error: "Could not generate a unique link. Please try again." },
    { status: 500 }
  );
}
