import "server-only";
import { createClient } from "@supabase/supabase-js";

// This client uses the SERVICE ROLE key and must only ever be imported
// from server-side code (API routes / server components). The
// `server-only` import above makes any accidental client-bundle import
// fail at build time rather than leaking the key to the browser.
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables. See .env.example."
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export type Direction = "a_to_b" | "b_to_a";

export interface MessageRow {
  id: string;
  space_id: string;
  direction: Direction;
  content: string;
  attachment_path: string | null;
  attachment_type: string | null;
  created_at: string;
  opened_at: string | null;
}

export interface SpaceRow {
  id: string;
  slug: string;
  created_at: string;
}
