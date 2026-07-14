-- Run this in the Supabase SQL editor (Dashboard > SQL Editor > New query)

create table clients (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid references auth.users(id) unique,
  business_name text,
  email text,
  tier text, -- 'starter' | 'growth' | 'premium' | null (one-off clients)
  client_type text default 'subscriber', -- 'subscriber' | 'project'
  renews_at date,
  created_at timestamptz default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text not null,
  type text not null, -- 'flyer' | 'logo' | 'brand' | 'web'
  status text not null default 'submitted', -- 'submitted' | 'in_review' | 'delivered'
  brief text,
  delivered_at timestamptz,
  created_at timestamptz default now()
);

-- Row Level Security: a client can only ever see their own rows.
alter table clients enable row level security;
alter table requests enable row level security;

create policy "clients read own row"
  on clients for select
  using (auth.uid() = auth_user_id);

create policy "requests read own"
  on requests for select
  using (
    client_id in (
      select id from clients where auth_user_id = auth.uid()
    )
  );

-- Requests are inserted by you (via the Supabase dashboard or a future
-- staff view), not directly by clients, so no insert policy for clients yet.
