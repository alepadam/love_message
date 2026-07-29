-- Run this once in the Supabase SQL editor (or via `supabase db push`
-- if you're using the Supabase CLI) before the app can work.

create extension if not exists pgcrypto;

create table if not exists spaces (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  direction text not null check (direction in ('a_to_b', 'b_to_a')),
  content text not null,
  attachment_path text,
  attachment_type text,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  -- Only one "current" message per direction per space — a new write
  -- overwrites the previous one via upsert on this constraint.
  unique (space_id, direction)
);

create index if not exists messages_space_id_idx on messages(space_id);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  role text not null check (role in ('a', 'b')),
  name text,
  birthday date,
  avatar_path text,
  updated_at timestamptz not null default now(),
  -- One profile per person per space, same overwrite-on-save pattern
  -- as messages.
  unique (space_id, role)
);

create index if not exists profiles_space_id_idx on profiles(space_id);

create table if not exists pairing_codes (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  code text unique not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz
);

create index if not exists pairing_codes_code_idx on pairing_codes(code);

create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  space_id uuid not null references spaces(id) on delete cascade,
  direction text not null check (direction in ('a_to_b', 'b_to_a')),
  content text not null,
  -- Deliberately a SEPARATE storage object from the corresponding
  -- messages.attachment_path, copied at send time (see /api/messages).
  -- Without this, deleting a replaced "current message" attachment
  -- would break the image on this permanent journal page.
  attachment_path text,
  attachment_type text,
  created_at timestamptz not null default now()
);

create index if not exists journal_entries_space_id_created_at_idx
  on journal_entries(space_id, created_at);

-- Row Level Security is enabled but no policies are defined for the
-- anon/authenticated roles: all reads and writes go through the Next.js
-- API routes using the service_role key (which bypasses RLS by design).
-- The browser is never given a Supabase key directly, so this is safe
-- as configured. If you ever add direct client-side Supabase calls,
-- you must add explicit policies first.
alter table spaces enable row level security;
alter table messages enable row level security;
alter table profiles enable row level security;
alter table pairing_codes enable row level security;
alter table journal_entries enable row level security;

-- Private storage bucket for attachments. Create this via the Supabase
-- dashboard (Storage → New bucket → name "attachments" → Private) or
-- uncomment and run the equivalent below if you're on the Supabase CLI
-- with the storage extension available:
--
-- insert into storage.buckets (id, name, public)
-- values ('attachments', 'attachments', false)
-- on conflict (id) do nothing;
