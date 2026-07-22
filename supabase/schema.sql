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

-- Row Level Security is enabled but no policies are defined for the
-- anon/authenticated roles: all reads and writes go through the Next.js
-- API routes using the service_role key (which bypasses RLS by design).
-- The browser is never given a Supabase key directly, so this is safe
-- as configured. If you ever add direct client-side Supabase calls,
-- you must add explicit policies first.
alter table spaces enable row level security;
alter table messages enable row level security;

-- Private storage bucket for attachments. Create this via the Supabase
-- dashboard (Storage → New bucket → name "attachments" → Private) or
-- uncomment and run the equivalent below if you're on the Supabase CLI
-- with the storage extension available:
--
-- insert into storage.buckets (id, name, public)
-- values ('attachments', 'attachments', false)
-- on conflict (id) do nothing;
