-- In-app notifications shown in the portal (separate from the Mailgun
-- emails in lib/email.js, which fire alongside these). Staff notifications
-- are shared across the whole team (there's no per-staff-member account
-- model anywhere else in this app either) — any staff member opening
-- /staff/notifications marks all of them read. Client notifications are
-- scoped per client_id and marked read when that client opens
-- /dashboard/notifications.
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_type text not null check (recipient_type in ('client', 'staff')),
  client_id uuid references clients(id) on delete cascade,
  request_id uuid references requests(id) on delete cascade,
  type text not null, -- 'message' | 'delivered' | 'new_request'
  title text not null,
  body text,
  link text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_client_id_idx on notifications(client_id);
create index if not exists notifications_recipient_type_idx on notifications(recipient_type);
create index if not exists notifications_created_at_idx on notifications(created_at desc);
