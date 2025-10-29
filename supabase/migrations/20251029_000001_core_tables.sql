-- Enable required extensions
create extension if not exists pgcrypto;

-- RAW EVENTS (append-only)
create table if not exists public.raw_events (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  source_type text not null check (source_type in ('nostr','form','import')),
  raw_json jsonb not null,
  pubkey text,
  signature text,
  relay text,
  event_id text,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- NORMALIZED EVENTS (versioned)
create table if not exists public.normalized_events (
  id uuid primary key default gen_random_uuid(),
  event_uid text not null,
  version integer not null check (version > 0),
  normalized_json jsonb not null,
  dedupe_key text not null,
  source_raw_id uuid references public.raw_events(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(event_uid, version)
);

-- LATEST VIEW (read-only for UI)
create or replace view public.normalized_events_latest as
select distinct on (event_uid)
  event_uid,
  version,
  normalized_json,
  dedupe_key,
  source_raw_id,
  created_at
from public.normalized_events
order by event_uid, version desc;

-- REVIEW QUEUE
create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  raw_event_id uuid references public.raw_events(id) on delete cascade,
  extracted_summary jsonb,
  confidence_score numeric check (confidence_score >= 0 and confidence_score <= 1),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  reviewer text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.raw_events enable row level security;
alter table public.normalized_events enable row level security;
alter table public.review_queue enable row level security;

-- Policies (locked down by default)
-- Deny all by default; allow only read on latest view via grant
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_events' AND policyname = 'raw_events_no_select'
  ) THEN
    DROP POLICY raw_events_no_select ON public.raw_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'raw_events' AND policyname = 'raw_events_no_write'
  ) THEN
    DROP POLICY raw_events_no_write ON public.raw_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'normalized_events' AND policyname = 'normalized_no_select'
  ) THEN
    DROP POLICY normalized_no_select ON public.normalized_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'normalized_events' AND policyname = 'normalized_no_write'
  ) THEN
    DROP POLICY normalized_no_write ON public.normalized_events;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'review_queue' AND policyname = 'review_queue_no_access'
  ) THEN
    DROP POLICY review_queue_no_access ON public.review_queue;
  END IF;
END$$;

create policy raw_events_no_select on public.raw_events
  for select using (false);
create policy raw_events_no_write on public.raw_events
  for all using (false) with check (false);

create policy normalized_no_select on public.normalized_events
  for select using (false);
create policy normalized_no_write on public.normalized_events
  for all using (false) with check (false);

create policy review_queue_no_access on public.review_queue
  for all using (false) with check (false);

-- VIEW grants for anon (UI)
grant usage on schema public to anon;
grant select on public.normalized_events_latest to anon;

-- Service role should have full access; in Supabase, service_role bypasses RLS.
-- Optionally grant explicit privileges (not strictly required with service role):
grant select, insert, update, delete on public.raw_events to service_role;
grant select, insert, update, delete on public.normalized_events to service_role;
grant select, insert, update, delete on public.review_queue to service_role;
