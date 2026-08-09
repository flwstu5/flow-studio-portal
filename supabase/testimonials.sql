create table if not exists testimonials (
  id uuid primary key default gen_random_uuid(),
  request_id uuid references requests(id) on delete set null,
  client_id uuid references clients(id) on delete set null,
  business_name text not null,
  quote text not null,
  role text,
  result text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists testimonials_published_idx on testimonials (published);
