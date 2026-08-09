create table if not exists staff_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  notes text,
  due_date date,
  done boolean not null default false,
  created_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists staff_tasks_done_idx on staff_tasks (done);

-- RLS enabled with no policies: staff-only, same pattern as client_notes —
-- only the service-role key (used by app/staff/actions.js) can read or
-- write these, never a client session.
alter table staff_tasks enable row level security;
