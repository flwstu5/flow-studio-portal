-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)
-- Stores every public snapshot lead (not just ones matching an existing
-- client) so the nurture-email cron on flowstudiogrfx.com has a record to
-- follow up against. Only ever touched via the service-role admin client
-- (main site server function + the /api/cron/nurture route) — never from
-- the browser — so RLS is enabled with no policies, which locks it out of
-- anon/authenticated access entirely.

create table if not exists snapshot_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  business text,
  url text not null,
  grade_letter text,
  grade_percent int,
  opportunity_count int,
  checks jsonb,
  page_speed jsonb,
  reviews jsonb,
  nurture_3day_sent_at timestamptz,
  nurture_7day_sent_at timestamptz,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table snapshot_leads enable row level security;

create index if not exists snapshot_leads_nurture_3day_idx
  on snapshot_leads (created_at) where nurture_3day_sent_at is null;

create index if not exists snapshot_leads_nurture_7day_idx
  on snapshot_leads (created_at) where nurture_7day_sent_at is null;
