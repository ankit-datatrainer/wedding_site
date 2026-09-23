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
  role           text not null default 'member' check (role in ('member','admin')),
  phone          text,
  photo_url      text,
  -- Gallery (array of /uploads/... URLs) and the full matrimonial profile
  -- (family, career, horoscope, about-me...) captured by the onboarding
  -- wizard. jsonb rather than dozens of columns — the field set has grown
  -- once already and will again; see server/src/routes/auth.js for the
  -- current shape of `details`.
  photos         jsonb not null default '[]'::jsonb,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

-- Safe to re-run against a database created before these columns existed.
alter table users add column if not exists role      text not null default 'member';
alter table users add column if not exists phone      text;
alter table users add column if not exists photo_url  text;
alter table users add column if not exists photos     jsonb not null default '[]'::jsonb;
alter table users add column if not exists details    jsonb not null default '{}'::jsonb;

create index if not exists users_role_idx on users (role);

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

-- ---------------------------------------------------------------------------
-- Migration 002 (team roles, profile approval, biodata details, email log).
-- Also shipped standalone in migrations/002_team_roles_approval.sql for
-- databases created before it existed.
-- ---------------------------------------------------------------------------

-- 1. Directory profiles: approval workflow + the full biodata blob.
alter table profiles add column if not exists status       text not null default 'approved';
alter table profiles add column if not exists details      jsonb not null default '{}'::jsonb;
alter table profiles add column if not exists source       text;
alter table profiles add column if not exists created_by   text;
alter table profiles add column if not exists approved_by  text;
alter table profiles add column if not exists approved_at  timestamptz;
alter table profiles add column if not exists review_note  text;

alter table profiles drop constraint if exists profiles_status_check;
alter table profiles add constraint profiles_status_check
  check (status in ('pending', 'approved', 'rejected'));

create index if not exists profiles_status_idx on profiles (status);

-- 2. Team roles (staff, manager, developer, content editor, custom...).
create table if not exists admin_roles (
  id           text primary key,
  name         text not null unique,
  description  text,
  permissions  jsonb not null default '[]'::jsonb,
  is_system    boolean not null default false,
  created_at   timestamptz not null default now()
);

-- 3. Team accounts live in `users` with role = 'staff' and a role id.
alter table users add column if not exists admin_role_id text references admin_roles(id) on delete set null;
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (role in ('member', 'admin', 'staff'));

-- 4. Every parent confirmation email the platform sends (or tries to).
create table if not exists email_logs (
  id          text primary key,
  to_email    text not null,
  relation    text,
  child_name  text,
  user_email  text,
  subject     text,
  status      text not null,
  error       text,
  sent_at     timestamptz not null default now()
);

alter table admin_roles enable row level security;
alter table email_logs  enable row level security;

-- Public read access to profiles must only ever expose approved ones.
drop policy if exists "public read profiles" on profiles;
create policy "public read profiles" on profiles for select using (status = 'approved');
