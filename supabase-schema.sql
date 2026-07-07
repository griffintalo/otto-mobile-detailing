-- Run this once in the Supabase SQL Editor for your new project.

create table if not exists availability (
  loc_id text not null,
  date date not null,
  primary key (loc_id, date)
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  loc_id text not null,
  date date not null,
  service text not null,
  vehicle_type text not null,
  name text not null,
  phone text not null,
  email text,
  vehicle text not null,
  notes text,
  created_at timestamptz not null default now(),
  unique (loc_id, date)
);

-- Row Level Security: block all direct public access.
-- The site's server (using the service role key) bypasses this safely.
alter table availability enable row level security;
alter table bookings enable row level security;
