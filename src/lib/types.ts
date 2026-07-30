export type Direction = "a_to_b" | "b_to_a";

export interface ClientMessage {
  id: string;
  direction: Direction;
  content: string;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  created_at: string;
  opened_at: string | null;
}

export interface SpaceResponse {
  slug: string;
  messages: ClientMessage[];
}

export interface ClientProfile {
  id: string;
  role: "a" | "b";
  name: string | null;
  birthday: string | null;
  avatar_path: string | null;
  avatar_url: string | null;
  updated_at: string;
}

export interface ProfilesResponse {
  slug: string;
  profiles: ClientProfile[];
}

export interface ClientDecoration {
  id: string;
  emoji: string;
  x: number;
  y: number;
  created_by: "a" | "b";
  created_at: string;
}

export interface ClientJournalEntry {
  id: string;
  direction: Direction;
  content: string;
  attachment_path: string | null;
  attachment_type: string | null;
  attachment_url: string | null;
  created_at: string;
  decorations: ClientDecoration[];
}

export interface JournalResponse {
  slug: string;
  entries: ClientJournalEntry[];
}
