-- EverAfter — Supabase schema.
-- Run this in the Supabase SQL editor, then `npm run seed` in /server to load
-- the profile and success-story content.

create table if not exists profiles (
  id                text primary key,
  name              text not null,
  age               int  not null,
  gender            text not null check (gender in ('male','female')),
  profession        text,
  location          text,
  city              text,
  education         text,
  education_level   text,
  religion          text,
  community         text,
  marital_status    text,
  verified          boolean not null default false,
  height_cm         int,
  mother_tongue     text,
  diet              text,
  photo             text,
  about             text,
  last_active_days  int not null default 0,
  created_at        timestamptz not null default now()
);

create index if not exists profiles_filter_idx
  on profiles (gender, age, religion, marital_status, education_level);

create table if not exists success_stories (
  id      text primary key,
  couple  text not null,
  rating  int  not null default 5,
  quote   text not null,
  photo   text
);

create table if not exists users (
  id             text primary key,
  email          text not null unique,
  password_hash  text not null,
  first_name     text,
  last_name      text,
  gender         text,
  dob            date,
  profile_for    text,
  plan_id        text,
  created_at     timestamptz not null default now()
);

create table if not exists shortlists (
  id          bigserial primary key,
  user_id     text not null references users(id) on delete cascade,
  profile_id  text not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, profile_id)
);

create table if not exists interests (
  id          bigserial primary key,
  user_id     text not null references users(id) on delete cascade,
  profile_id  text not null references profiles(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, profile_id)
);

create table if not exists orders (
  id          text primary key,           -- Razorpay order id
  user_id     text not null references users(id) on delete cascade,
  plan_id     text not null,
  amount      int  not null,              -- paise
  currency    text not null default 'INR',
  status      text not null default 'created',
  payment_id  text,
  receipt     text,
  created_at  timestamptz not null default now()
);

create table if not exists newsletter_subscribers (
  email       text primary key,
  created_at  timestamptz not null default now()
);

-- The API uses the service role key and enforces access in application code,
-- so RLS is enabled with no public policies: anon/authenticated clients get
-- nothing directly, the service role bypasses RLS.
alter table users                  enable row level security;
alter table shortlists             enable row level security;
alter table interests              enable row level security;
alter table orders                 enable row level security;
alter table newsletter_subscribers enable row level security;

-- Profile and story content is public, read-only.
alter table profiles        enable row level security;
alter table success_stories enable row level security;

drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (true);

drop policy if exists "public read stories" on success_stories;
create policy "public read stories" on success_stories for select using (true);
