-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)
-- Adds a place to store website snapshot reports run from flowstudiogrfx.com/snapshot,
-- so they can show up as a reminder in the client's dashboard and in staff view.

alter table clients add column if not exists website_url text;

create table if not exists snapshots (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  url text not null,
  grade_letter text,
  grade_percent int,
  opportunity_count int,
  checks jsonb,
  page_speed jsonb,
  reviews jsonb,
  competitors jsonb,
  created_at timestamptz default now()
);

alter table snapshots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'snapshots' and policyname = 'clients read own snapshots'
  ) then
    create policy "clients read own snapshots"
      on snapshots for select
      using (
        client_id in (select id from clients where auth_user_id = auth.uid())
      );
  end if;
end $$;
