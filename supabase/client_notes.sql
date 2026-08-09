create table if not exists client_notes (
  client_id uuid primary key references clients(id) on delete cascade,
  notes text,
  updated_at timestamptz not null default now()
);

-- RLS enabled with no policies: only the service-role key (used by the
-- staff-only server actions) can read or write this table. There is no
-- policy granting anon/authenticated access, so a client's own session can
-- never see these notes, regardless of how the clients table's own RLS is
-- configured.
alter table client_notes enable row level security;
