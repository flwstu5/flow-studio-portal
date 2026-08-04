-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)

alter table clients add column if not exists accent_color text;
alter table clients add column if not exists onboarding_completed_at timestamptz;

-- Clients need to be able to update their own row (for onboarding + the
-- profile page). Skips creating the policy if one already exists.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'clients' and policyname = 'clients update own row'
  ) then
    create policy "clients update own row"
      on clients for update
      using (auth.uid() = auth_user_id)
      with check (auth.uid() = auth_user_id);
  end if;
end $$;

-- Optional: any existing clients (e.g. ones you already know have a
-- password set) won't be forced through onboarding again if you run this.
-- Leave commented out if you'd rather everyone go through it once.
-- update clients set onboarding_completed_at = now() where onboarding_completed_at is null;
