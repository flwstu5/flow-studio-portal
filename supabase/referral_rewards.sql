-- The referrals table (created by the marketing site's supabase/referrals.sql,
-- same shared project) only tracks whether a code was redeemed at intake —
-- not whether staff have actually applied the reward. These columns let
-- staff track and mark that separately from the redemption flow.
alter table referrals add column if not exists reward_status text not null default 'none' check (reward_status in ('none', 'owed', 'paid'));
alter table referrals add column if not exists reward_paid_at timestamptz;
