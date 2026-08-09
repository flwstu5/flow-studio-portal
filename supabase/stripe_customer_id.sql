-- Stores the Stripe Customer ID on each client so the portal can open
-- Stripe's hosted Billing Portal for self-service plan management/cancellation.
-- The webhook now saves this on every checkout, but existing subscribers
-- won't have one on file until they next complete a Stripe checkout/portal
-- session — there's no row here to backfill from without pulling IDs
-- manually from the Stripe Dashboard.
alter table clients add column if not exists stripe_customer_id text;
