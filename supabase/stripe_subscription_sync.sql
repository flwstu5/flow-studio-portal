-- Lets the webhook keep a client's tier in sync when they cancel or change
-- plans through the self-service billing portal, instead of only ever
-- updating on a brand-new checkout.
alter table clients add column if not exists subscription_status text;
alter table clients add column if not exists cancel_at_period_end boolean not null default false;
