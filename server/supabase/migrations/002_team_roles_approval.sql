-- EverAfter — migration 002: team roles, profile approval, full biodata
-- details on directory profiles, and the parent-notification email log.
--
-- Paste into the Supabase SQL editor and run once. Every statement is
-- idempotent, so re-running it is harmless. Until it has been run the API
-- keeps serving the site, but the Team & Roles, approval and email-log
-- features answer with a "run migration 002" message instead of working.

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
