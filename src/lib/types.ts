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
