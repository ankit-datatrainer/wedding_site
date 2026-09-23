-- EverAfter — complete Supabase setup.
--
-- GENERATED FILE — do not edit by hand. Regenerate with:  npm run gen:sql
--
-- Paste this whole file into the Supabase SQL editor and run it once. It
-- creates every table, enables RLS, and loads all 8 directory profiles
-- plus 3 success stories. Safe to re-run.

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

-- ---------------------------------------------------------------------------
-- Directory profiles (8) — the pool the matching algorithm ranks over.
-- ---------------------------------------------------------------------------

insert into profiles (id, name, age, gender, profession, location, city, education, education_level, religion, community, marital_status, verified, height_cm, mother_tongue, diet, photo, about, last_active_days) values
  ('p1', 'Rohan Sharma', 29, 'male', 'Senior Software Architect', 'Bengaluru, Karnataka', 'Bengaluru', 'B.Tech in Computer Science, IIT Bombay', 'Bachelors', 'Hindu', 'Brahmin', 'Never Married', true, 180, 'Hindi', 'Vegetarian', '/profiles/boy_rohan.jpg', 'Passionate tech architect who loves building scalable systems, morning runs, and Hindustani classical music. Looking for an empathetic, intellectual partner to share life adventures.', 0),
  ('p2', 'Arjun Singhania', 31, 'male', 'Investment Banker & VP', 'Mumbai, Maharashtra', 'Mumbai', 'MBA Finance, IIM Ahmedabad', 'Masters', 'Hindu', 'Agarwal', 'Never Married', true, 178, 'Hindi', 'Vegetarian', '/profiles/boy_arjun.jpg', 'Driven by curiosity and global markets during the week; avid reader and weekend golfer. Seeking someone grounded with a warm sense of humor who values family and shared dreams.', 1),
  ('p3', 'Dr. Rahul Sharma', 32, 'male', 'Consultant Cardiologist', 'New Delhi, NCR', 'Delhi', 'MD & DM Cardiology, AIIMS New Delhi', 'Doctorate', 'Hindu', 'Khatri', 'Never Married', true, 182, 'Punjabi', 'Eggetarian', '/profiles/boy_rahul.jpg', 'Cardiologist dedicated to healing hearts. When off duty, I enjoy indie cinema, culinary experiments, and mountain treks. Looking for a compassionate partner with independent aspirations.', 2),
  ('p4', 'Vikramaditya Verma', 28, 'male', 'Principal Product Designer', 'Pune, Maharashtra', 'Pune', 'M.Des, National Institute of Design (NID)', 'Masters', 'Hindu', 'Kayastha', 'Never Married', true, 175, 'Hindi', 'Non-Vegetarian', '/profiles/boy_vikram.jpg', 'Designing intuitive digital experiences by day, passionate photographer and acoustic guitarist by night. Believer in deep conversations, honest communication, and mutual respect.', 0),
  ('p5', 'Ananya Iyer', 27, 'female', 'AI Research Scientist', 'Bengaluru, Karnataka', 'Bengaluru', 'MS in Computer Science, IISc Bengaluru', 'Masters', 'Hindu', 'Iyer', 'Never Married', true, 165, 'Tamil', 'Vegetarian', '/profiles/girl_ananya.jpg', 'Fascinated by artificial intelligence and cognitive science. Outside work, I practice Carnatic vocals and love exploring quaint heritage cafes. Hoping to find a partner who values mutual growth.', 0),
  ('p6', 'Pooja Deshmukh', 28, 'female', 'Chartered Accountant (CA)', 'Mumbai, Maharashtra', 'Mumbai', 'CA, ICAI & M.Com, NMIMS', 'Masters', 'Hindu', 'Maratha', 'Never Married', true, 163, 'Marathi', 'Vegetarian', '/profiles/girl_pooja.jpg', 'Financial consultant who balances balance sheets with weekend baking and coastal road trips. Raised with traditional values and an open, progressive outlook on life.', 1),
  ('p7', 'Dr. Meera Sen', 29, 'female', 'Assistant Professor & Biologist', 'Kolkata, West Bengal', 'Kolkata', 'PhD in Molecular Biology, Presidency University', 'Doctorate', 'Hindu', 'Bengali', 'Never Married', true, 162, 'Bengali', 'Non-Vegetarian', '/profiles/girl_meera.jpg', 'Academic researcher fascinated by genetics and nature. I cherish Rabindra Sangeet, vintage bookstores, and filter coffee conversations. Seeking a gentle, intellectually curious companion.', 2),
  ('p8', 'Simran Kaur Dhillon', 26, 'female', 'Brand Strategy Director', 'Chandigarh, Punjab', 'Chandigarh', 'MBA Marketing, IIM Lucknow', 'Masters', 'Sikh', 'Jat', 'Never Married', true, 168, 'Punjabi', 'Vegetarian', '/profiles/girl_simran.jpg', 'Creative storyteller leading brand campaigns. Love lively family gatherings, exploring world cuisines, and sunset cycling. Looking for an optimistic, warm-hearted life partner.', 0)
on conflict (id) do update set
  name = excluded.name,
  age = excluded.age,
  gender = excluded.gender,
  profession = excluded.profession,
  location = excluded.location,
  city = excluded.city,
  education = excluded.education,
  education_level = excluded.education_level,
  religion = excluded.religion,
  community = excluded.community,
  marital_status = excluded.marital_status,
  verified = excluded.verified,
  height_cm = excluded.height_cm,
  mother_tongue = excluded.mother_tongue,
  diet = excluded.diet,
  photo = excluded.photo,
  about = excluded.about,
  last_active_days = excluded.last_active_days;

-- ---------------------------------------------------------------------------
-- Success stories (3)
-- ---------------------------------------------------------------------------

insert into success_stories (id, couple, rating, quote, photo) values
  ('s1', 'Gopal & Kanika', 5, 'We met on EverAfter and instantly clicked over our shared love for classical music and travel. The journey from our first conversation to our wedding day felt incredibly natural and meant to be. We are so grateful for this platform.', '/story_couple1.jpg'),
  ('s2', 'Priya & Vikram', 5, 'I was skeptical about online matchmaking until I found EverAfter. The detailed profiles helped me find someone who truly aligned with my values. Meeting Vikram changed my life forever.', '/about_couple.jpg'),
  ('s3', 'Aditya & Sneha', 5, 'Both our families were involved from the very first conversation, which is exactly what we wanted. Three months later we were engaged, surrounded by everyone we love.', '/story_thumb.jpg')
on conflict (id) do update set
  couple = excluded.couple,
  rating = excluded.rating,
  quote = excluded.quote,
  photo = excluded.photo;

-- Sanity check — should report 4 male and 4 female.
select gender, count(*) from profiles group by gender order by gender;
