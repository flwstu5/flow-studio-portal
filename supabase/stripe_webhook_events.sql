-- Stripe recommends deduping webhook deliveries by event id, since the same
-- event can be redelivered (retries, duplicate sends). Recording each
-- processed id here lets the webhook route short-circuit a redelivery
-- instead of re-running client creation/subscription sync a second time.
create table if not exists stripe_webhook_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now()
);

-- Service-role only (the webhook route always uses createAdminClient, never
-- a user session) — RLS with no policies for defense in depth, same pattern
-- as client_notes and staff_tasks.
alter table stripe_webhook_events enable row level security;
