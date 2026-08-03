-- EverAfter — complete Supabase setup.
--
-- GENERATED FILE — do not edit by hand. Regenerate with:  npm run gen:sql
--
-- Paste this whole file into the Supabase SQL editor and run it once. It
-- creates every table, enables RLS, and loads all 64 directory profiles
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
-- Directory profiles (64) — the pool the matching algorithm ranks over.
-- ---------------------------------------------------------------------------

insert into profiles (id, name, age, gender, profession, location, city, education, education_level, religion, community, marital_status, verified, height_cm, mother_tongue, diet, photo, about, last_active_days) values
  ('p1', 'Sritama Sengupta', 28, 'female', 'Neuro Surgeon', 'Mumbai, Maharashtra', 'Mumbai', 'MSC, IIT Mumbai', 'Masters', 'Hindu', 'Bengali', 'Never Married', true, 152, 'Bengali', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9LBUlc_MylVGYA9KGB-40IysTebeP8Au9h7HsoO2EoetrZISllIeSsSEYZuJymuGr0dTb250QwWDfIfpgiZyzHOHYd_VRow_Tn8PrBpIeM16kb9nBcdJq3ksPkIiPJ8GuqNzr9L74gxbROPIM1yE3PXUMPswFBNDkzUyrwUZ12gxwe88BKif_Yxr9AXrfP_1jFv9uFflERr3woq_oPLzD02CwLxSzgQTgWKHNn7qYQ6CYYGSv8WJec-kO0J9MwPm_FJhrdtAn-X2Q', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 0),
  ('p2', 'Rohan Chatterjee', 30, 'male', 'Software Architect', 'Pune, Maharashtra', 'Pune', 'B.Tech, NIT Surathkal', 'Bachelors', 'Hindu', 'Bengali', 'Never Married', true, 159, 'Hindi', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlqPa80r4nvmIlTjV1NIiKNR98RTZJB8f4FX4az3cgtpZChG1_g6Vjg-cW61jBmP1oPMhfoudIqySIChze1umuB4Cjywqn9WtTLMzgymqclpFmcHwcb7HMlk1-OkKt7zRDDhva6OBb5gQNIQrzt1neV5cSwhgJFuVsSwkNDppMBX-093y6XDHPwcg-HJ2bGl7tZRf37g3iBqaG8oNCsyZCKKspC2qNaz7eneW5pq0PMaGfn-sb8o_nfnt_4S8JVUCGkb8xba2naSjb', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 3),
  ('p3', 'Anjali Verma', 27, 'female', 'Marketing Director', 'Delhi, NCR', 'Delhi', 'MBA, IIM Ahmedabad', 'Masters', 'Hindu', 'Agarwal', 'Never Married', true, 166, 'Tamil', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxpDrvIDYCBIEmZ_39YL3KJYLkNCrnzQy8Azwf_WxyE_Hwonr1CF2D3NlOZnPW0qr_lM4nqsIl8ZyDfiVzUfPlAgQpXQmd5lr0NbdL2ygf62bcCK5xOTZQ7qPH4-sJNHz6tWELJ_plOHDGM1yG0nyfrx47Szt9Oz2rU3E1QdLYsgWbd6mZ6E0Pygry-FGfCeI1Q_DOQonxo-ddWF2rkJy0Pn8llF3L4eVrwhTqsRedf_NpExROMb-JTLeZ7gPgfAtWyhehL5bm7aBd', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 6),
  ('p4', 'Priya Sharma', 29, 'female', 'Financial Analyst', 'Bengaluru, Karnataka', 'Bengaluru', 'CA, ICAI', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 173, 'Marathi', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNMrX0Vorale0-udJUNO_ci3YziVELcz3-qpq3X5e-5U3eQKBkdp4Fk5oXjXj7vq5thI_BW9EWYBj7sFc9-Wbsm-q4gmOaXkowQUcwf4PBpKift3srctbmg7fZC6FvvV233Vqir2GhPADuu4kF7iA-QY805mlK4YcPxVX0ChdpMbqkdajA9WLgP4aqmm1mQ1tEnRUP_fdIP1DWo_MnD3f-wKL-qLnoVQ6ztyG0Aor02aPDvehFLrnfnf-u1lREqjNZpX0JN425hFa6', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 9),
  ('p5', 'Vikram Singh', 31, 'male', 'Corporate Lawyer', 'Hyderabad, Telangana', 'Hyderabad', 'LLB, NALSAR', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true, 180, 'Malayalam', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzT4WeTs482R3QUREWDNSWnKXeUnOOB5QZqg3pDW_k_SE2eC0-8xhME6eyCJiuPy5wieYd7OoCXC3JYoulxZMASzgujzCbbkV0apKjjKnG8l3BlK11aWgRqMZEwFDH7mVldDiuXcAGvF6fRTA37XVJc3lLirwTkIffO8s0lNNLV2oCs5zbZU712J1LFI6VxvWVfTiMBH7AMAZlA-nDItmDnNGi1lmHqZHMF3NdgfAPoCYjlfjT4s76_jpze7egAQPP2IUzLVDV7F-q', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 12),
  ('p6', 'Meera Krishnan', 26, 'female', 'Content Strategist', 'Chennai, Tamil Nadu', 'Chennai', 'MA, Madras University', 'Masters', 'Hindu', 'Iyer', 'Never Married', false, 157, 'Punjabi', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBL1mTyDq6JeHIE8I4L_ORHCEqxjPBz2WR_XD_U4i7tiMbNWsks4hR2NMxS6txqEYdImvSSUYQuEHN-Ttv4MhEYEn_wL3jRtSnpgvNizcgPdC8vmEb7vsX7Y8WQKwifJ4b8nTUct4e6JifQsPeyjrghmpSjENh4jQakspI0VoA-ltq5SUobnqBRkdETr05uLAW7NkEbraPvASwCsOP5JC391Dzm-lfXUpOChGuSmAtUTAA8K9ND9tjqTjMQ2V3x6sh19iWq3pZli8NR', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 1),
  ('p7', 'Aarav Desai', 30, 'male', 'Software Engineer', 'Pune, Maharashtra', 'Pune', 'B.Tech, NIT', 'Bachelors', 'Hindu', 'Patel', 'Never Married', true, 164, 'Bengali', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFC4rBxXNkJH0Ya2-zPmo6TJXhjbyRgWtM-sQKuyzyImRTywS7s5U8YQ06kNkAd00He5o0igf-E1VJ_rQP7UuCfMIQghxTqRpL98-1WOgaZPbsJKHVisigFyaNYoL1oF2CJ4Yhn_C04TsScz2lFNqhIztdPF6j7hVZVLCFE55959fLUqiEmhYoyf8ZEfOwJBi-9v8BF08YDNJw6RZWOlwrV_Fmj2Up9XBT2qItkvJlGJSJlj0DW-maEhd-liF3wjhtkT5GFtHXnN61', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 4),
  ('p8', 'Meera Patel', 27, 'female', 'Architect', 'Ahmedabad, Gujarat', 'Ahmedabad', 'M.Arch, CEPT', 'Masters', 'Hindu', 'Patel', 'Never Married', true, 171, 'Hindi', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUR3N-52m1K37mmIhXH_EuOMvizkc94pjiXVRzLRvyjmdaIea6i3_znPdL_0rdORkJCqKBuwLFvcOKBfan_XHx8ZK0PqpeL6Q10zoENaMTyVAnbiLZ66D_31zIQsgOFaw3rDyxUwSBSSDyxt8mLGiWYIVkIF6VJFUhRvjDqzLL-ayu6AKfwr-z2ZHq1ibKuKgfSViQQhREM5z_Tvih32oF43N25Ajl0005h9IKIkxoMEjGURrBKHbS7jGYUw27lTQoaaTDJ31WoMTu', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 7),
  ('p9', 'Ananya Sharma', 26, 'female', 'Marketing Manager', 'Delhi, NCR', 'Delhi', 'MBA, IIM', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 178, 'Tamil', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC797UazzcPJQwjp5ARh6hljZQ4RW7ap-KjFfuvKCY3yI5HccF9Z5KkmVoROETS3IA2CPOHl7yezZzf5w6KCV3CpiaVsP2ADcZ6lyyf_RG7ous-I3gAydqvh7t9Xsy7AYFX0TLb05gqsScdQN5gNipmU7pUv9XHvLYroH0Ay8FcWhNLmPnO8_J8HS7ogARjShktJO2SVIjLxi0rNplFNkbW6Tw1O4vj9u2z8l6asdAzOvsbOiv6dXdluQP5OSGAvOY-o5mWsntSPSdu', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 10),
  ('p10', 'Imran Sheikh', 32, 'male', 'Cardiologist', 'Lucknow, Uttar Pradesh', 'Lucknow', 'MD, KGMU', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true, 155, 'Marathi', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_032uhJrGuGyZVdY-yx5EwphbHFNES3JzVAuKssOR7pBgM2Z2kD-DIi6vyp3hPzEXLZd847BEnxvTakAx9ZMKWoZTNUaHTFFIuTOkXwIeY8x5CcHbh6o19QHp9HLxWlxWO6aVYvnlGce3eghbH7OKX6hmY59jDJimFc8qfBpuKcuhHFTZ9OnL7dyQ8a1810Ud4sdwrYhmo492HJNSn-z1zDc5HIPrgm5-ML9se5t6Tk3hqIo50Os0QXNe9t7zQWUZU6pTJGbU8wcd', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 13),
  ('p11', 'Fatima Ansari', 28, 'female', 'Data Scientist', 'Bengaluru, Karnataka', 'Bengaluru', 'MS, IISc', 'Masters', 'Muslim', 'Sunni', 'Never Married', true, 162, 'Malayalam', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9LBUlc_MylVGYA9KGB-40IysTebeP8Au9h7HsoO2EoetrZISllIeSsSEYZuJymuGr0dTb250QwWDfIfpgiZyzHOHYd_VRow_Tn8PrBpIeM16kb9nBcdJq3ksPkIiPJ8GuqNzr9L74gxbROPIM1yE3PXUMPswFBNDkzUyrwUZ12gxwe88BKif_Yxr9AXrfP_1jFv9uFflERr3woq_oPLzD02CwLxSzgQTgWKHNn7qYQ6CYYGSv8WJec-kO0J9MwPm_FJhrdtAn-X2Q', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 2),
  ('p12', 'Joseph Fernandes', 34, 'male', 'Civil Engineer', 'Goa', 'Goa', 'B.E, Goa College of Engineering', 'Bachelors', 'Christian', 'Catholic', 'Divorced', false, 169, 'Punjabi', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlqPa80r4nvmIlTjV1NIiKNR98RTZJB8f4FX4az3cgtpZChG1_g6Vjg-cW61jBmP1oPMhfoudIqySIChze1umuB4Cjywqn9WtTLMzgymqclpFmcHwcb7HMlk1-OkKt7zRDDhva6OBb5gQNIQrzt1neV5cSwhgJFuVsSwkNDppMBX-093y6XDHPwcg-HJ2bGl7tZRf37g3iBqaG8oNCsyZCKKspC2qNaz7eneW5pq0PMaGfn-sb8o_nfnt_4S8JVUCGkb8xba2naSjb', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 5),
  ('p13', 'Ritika Nair', 25, 'female', 'UX Designer', 'Kochi, Kerala', 'Kochi', 'B.Des, NID', 'Bachelors', 'Hindu', 'Nair', 'Never Married', true, 176, 'Bengali', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxpDrvIDYCBIEmZ_39YL3KJYLkNCrnzQy8Azwf_WxyE_Hwonr1CF2D3NlOZnPW0qr_lM4nqsIl8ZyDfiVzUfPlAgQpXQmd5lr0NbdL2ygf62bcCK5xOTZQ7qPH4-sJNHz6tWELJ_plOHDGM1yG0nyfrx47Szt9Oz2rU3E1QdLYsgWbd6mZ6E0Pygry-FGfCeI1Q_DOQonxo-ddWF2rkJy0Pn8llF3L4eVrwhTqsRedf_NpExROMb-JTLeZ7gPgfAtWyhehL5bm7aBd', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 8),
  ('p14', 'Harpreet Kaur', 29, 'female', 'Pharmacist', 'Chandigarh, Punjab', 'Chandigarh', 'M.Pharm, PU', 'Masters', 'Sikh', 'Arora', 'Never Married', true, 153, 'Hindi', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNMrX0Vorale0-udJUNO_ci3YziVELcz3-qpq3X5e-5U3eQKBkdp4Fk5oXjXj7vq5thI_BW9EWYBj7sFc9-Wbsm-q4gmOaXkowQUcwf4PBpKift3srctbmg7fZC6FvvV233Vqir2GhPADuu4kF7iA-QY805mlK4YcPxVX0ChdpMbqkdajA9WLgP4aqmm1mQ1tEnRUP_fdIP1DWo_MnD3f-wKL-qLnoVQ6ztyG0Aor02aPDvehFLrnfnf-u1lREqjNZpX0JN425hFa6', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 11),
  ('p15', 'Arjun Reddy', 33, 'male', 'Investment Banker', 'Hyderabad, Telangana', 'Hyderabad', 'MBA, ISB', 'Masters', 'Hindu', 'Reddy', 'Never Married', true, 160, 'Tamil', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDzT4WeTs482R3QUREWDNSWnKXeUnOOB5QZqg3pDW_k_SE2eC0-8xhME6eyCJiuPy5wieYd7OoCXC3JYoulxZMASzgujzCbbkV0apKjjKnG8l3BlK11aWgRqMZEwFDH7mVldDiuXcAGvF6fRTA37XVJc3lLirwTkIffO8s0lNNLV2oCs5zbZU712J1LFI6VxvWVfTiMBH7AMAZlA-nDItmDnNGi1lmHqZHMF3NdgfAPoCYjlfjT4s76_jpze7egAQPP2IUzLVDV7F-q', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 0),
  ('p16', 'Sneha Iyer', 27, 'female', 'Clinical Psychologist', 'Chennai, Tamil Nadu', 'Chennai', 'M.Phil, NIMHANS', 'Doctorate', 'Hindu', 'Iyer', 'Never Married', true, 167, 'Marathi', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBL1mTyDq6JeHIE8I4L_ORHCEqxjPBz2WR_XD_U4i7tiMbNWsks4hR2NMxS6txqEYdImvSSUYQuEHN-Ttv4MhEYEn_wL3jRtSnpgvNizcgPdC8vmEb7vsX7Y8WQKwifJ4b8nTUct4e6JifQsPeyjrghmpSjENh4jQakspI0VoA-ltq5SUobnqBRkdETr05uLAW7NkEbraPvASwCsOP5JC391Dzm-lfXUpOChGuSmAtUTAA8K9ND9tjqTjMQ2V3x6sh19iWq3pZli8NR', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 3),
  ('p17', 'Kabir Malhotra', 31, 'male', 'Product Manager', 'Gurugram, Haryana', 'Gurugram', 'MBA, FMS Delhi', 'Masters', 'Hindu', 'Khatri', 'Never Married', true, 174, 'Malayalam', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFC4rBxXNkJH0Ya2-zPmo6TJXhjbyRgWtM-sQKuyzyImRTywS7s5U8YQ06kNkAd00He5o0igf-E1VJ_rQP7UuCfMIQghxTqRpL98-1WOgaZPbsJKHVisigFyaNYoL1oF2CJ4Yhn_C04TsScz2lFNqhIztdPF6j7hVZVLCFE55959fLUqiEmhYoyf8ZEfOwJBi-9v8BF08YDNJw6RZWOlwrV_Fmj2Up9XBT2qItkvJlGJSJlj0DW-maEhd-liF3wjhtkT5GFtHXnN61', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 6),
  ('p18', 'Divya Rao', 30, 'female', 'Professor', 'Mysuru, Karnataka', 'Mysuru', 'PhD, IISc', 'Doctorate', 'Hindu', 'Madhwa', 'Widowed', false, 181, 'Punjabi', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUR3N-52m1K37mmIhXH_EuOMvizkc94pjiXVRzLRvyjmdaIea6i3_znPdL_0rdORkJCqKBuwLFvcOKBfan_XHx8ZK0PqpeL6Q10zoENaMTyVAnbiLZ66D_31zIQsgOFaw3rDyxUwSBSSDyxt8mLGiWYIVkIF6VJFUhRvjDqzLL-ayu6AKfwr-z2ZHq1ibKuKgfSViQQhREM5z_Tvih32oF43N25Ajl0005h9IKIkxoMEjGURrBKHbS7jGYUw27lTQoaaTDJ31WoMTu', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 9),
  ('p19', 'Aditya Joshi', 28, 'male', 'Chartered Accountant', 'Nagpur, Maharashtra', 'Nagpur', 'CA, ICAI', 'Bachelors', 'Hindu', 'Deshastha', 'Never Married', true, 158, 'Bengali', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC797UazzcPJQwjp5ARh6hljZQ4RW7ap-KjFfuvKCY3yI5HccF9Z5KkmVoROETS3IA2CPOHl7yezZzf5w6KCV3CpiaVsP2ADcZ6lyyf_RG7ous-I3gAydqvh7t9Xsy7AYFX0TLb05gqsScdQN5gNipmU7pUv9XHvLYroH0Ay8FcWhNLmPnO8_J8HS7ogARjShktJO2SVIjLxi0rNplFNkbW6Tw1O4vj9u2z8l6asdAzOvsbOiv6dXdluQP5OSGAvOY-o5mWsntSPSdu', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 12),
  ('p20', 'Nikita Bansal', 26, 'female', 'Fashion Entrepreneur', 'Jaipur, Rajasthan', 'Jaipur', 'B.Des, NIFT', 'Bachelors', 'Hindu', 'Agarwal', 'Never Married', true, 165, 'Hindi', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC_032uhJrGuGyZVdY-yx5EwphbHFNES3JzVAuKssOR7pBgM2Z2kD-DIi6vyp3hPzEXLZd847BEnxvTakAx9ZMKWoZTNUaHTFFIuTOkXwIeY8x5CcHbh6o19QHp9HLxWlxWO6aVYvnlGce3eghbH7OKX6hmY59jDJimFc8qfBpuKcuhHFTZ9OnL7dyQ8a1810Ud4sdwrYhmo492HJNSn-z1zDc5HIPrgm5-ML9se5t6Tk3hqIo50Os0QXNe9t7zQWUZU6pTJGbU8wcd', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 1),
  ('p21', 'Rahul Mehta', 35, 'male', 'Orthopaedic Surgeon', 'Surat, Gujarat', 'Surat', 'MS, AIIMS', 'Doctorate', 'Hindu', 'Jain', 'Divorced', true, 172, 'Tamil', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuC9LBUlc_MylVGYA9KGB-40IysTebeP8Au9h7HsoO2EoetrZISllIeSsSEYZuJymuGr0dTb250QwWDfIfpgiZyzHOHYd_VRow_Tn8PrBpIeM16kb9nBcdJq3ksPkIiPJ8GuqNzr9L74gxbROPIM1yE3PXUMPswFBNDkzUyrwUZ12gxwe88BKif_Yxr9AXrfP_1jFv9uFflERr3woq_oPLzD02CwLxSzgQTgWKHNn7qYQ6CYYGSv8WJec-kO0J9MwPm_FJhrdtAn-X2Q', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 4),
  ('p22', 'Zoya Khan', 24, 'female', 'Journalist', 'Mumbai, Maharashtra', 'Mumbai', 'MA, Jamia Millia', 'Masters', 'Muslim', 'Sunni', 'Never Married', false, 179, 'Marathi', 'Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuAlqPa80r4nvmIlTjV1NIiKNR98RTZJB8f4FX4az3cgtpZChG1_g6Vjg-cW61jBmP1oPMhfoudIqySIChze1umuB4Cjywqn9WtTLMzgymqclpFmcHwcb7HMlk1-OkKt7zRDDhva6OBb5gQNIQrzt1neV5cSwhgJFuVsSwkNDppMBX-093y6XDHPwcg-HJ2bGl7tZRf37g3iBqaG8oNCsyZCKKspC2qNaz7eneW5pq0PMaGfn-sb8o_nfnt_4S8JVUCGkb8xba2naSjb', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 7),
  ('p23', 'Sameer Dutta', 29, 'male', 'Research Scientist', 'Kolkata, West Bengal', 'Kolkata', 'PhD, IIT Kharagpur', 'Doctorate', 'Hindu', 'Kayastha', 'Never Married', true, 156, 'Malayalam', 'Non-Vegetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuCxpDrvIDYCBIEmZ_39YL3KJYLkNCrnzQy8Azwf_WxyE_Hwonr1CF2D3NlOZnPW0qr_lM4nqsIl8ZyDfiVzUfPlAgQpXQmd5lr0NbdL2ygf62bcCK5xOTZQ7qPH4-sJNHz6tWELJ_plOHDGM1yG0nyfrx47Szt9Oz2rU3E1QdLYsgWbd6mZ6E0Pygry-FGfCeI1Q_DOQonxo-ddWF2rkJy0Pn8llF3L4eVrwhTqsRedf_NpExROMb-JTLeZ7gPgfAtWyhehL5bm7aBd', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 10),
  ('p24', 'Aishwarya Menon', 31, 'female', 'Airline Pilot', 'Kochi, Kerala', 'Kochi', 'B.Sc Aviation, IGRUA', 'Bachelors', 'Hindu', 'Menon', 'Never Married', true, 163, 'Punjabi', 'Eggetarian', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDNMrX0Vorale0-udJUNO_ci3YziVELcz3-qpq3X5e-5U3eQKBkdp4Fk5oXjXj7vq5thI_BW9EWYBj7sFc9-Wbsm-q4gmOaXkowQUcwf4PBpKift3srctbmg7fZC6FvvV233Vqir2GhPADuu4kF7iA-QY805mlK4YcPxVX0ChdpMbqkdajA9WLgP4aqmm1mQ1tEnRUP_fdIP1DWo_MnD3f-wKL-qLnoVQ6ztyG0Aor02aPDvehFLrnfnf-u1lREqjNZpX0JN425hFa6', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 13),
  ('dm1', 'Ravi Kumar', 29, 'male', 'Software Developer', 'Bengaluru, Karnataka', 'Bengaluru', 'B.Tech, IIIT Bangalore', 'Bachelors', 'Hindu', 'Reddy', 'Never Married', true, 165, 'Hindi', 'Vegetarian', 'https://randomuser.me/api/portraits/men/1.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 0),
  ('dm2', 'Amitabh Chauhan', 32, 'male', 'Bank Manager', 'Lucknow, Uttar Pradesh', 'Lucknow', 'MBA, IIM Lucknow', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 168, 'Punjabi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/2.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 2),
  ('dm3', 'Suresh Pillai', 34, 'male', 'Marine Engineer', 'Kochi, Kerala', 'Kochi', 'B.Tech, CUSAT', 'Bachelors', 'Hindu', 'Nair', 'Divorced', false, 171, 'Tamil', 'Eggetarian', 'https://randomuser.me/api/portraits/men/3.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 4),
  ('dm4', 'Farhan Ahmed', 28, 'male', 'Graphic Designer', 'Hyderabad, Telangana', 'Hyderabad', 'B.Des, NID', 'Bachelors', 'Muslim', 'Sunni', 'Never Married', true, 174, 'Malayalam', 'Vegetarian', 'https://randomuser.me/api/portraits/men/4.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 6),
  ('dm5', 'Gurpreet Singh', 31, 'male', 'Restaurateur', 'Amritsar, Punjab', 'Amritsar', 'B.Com, GNDU', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true, 177, 'Marathi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/5.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 8),
  ('dm6', 'Anand Krishnan', 27, 'male', 'Data Analyst', 'Chennai, Tamil Nadu', 'Chennai', 'M.Sc Statistics, Loyola', 'Masters', 'Hindu', 'Iyengar', 'Never Married', false, 180, 'Gujarati', 'Eggetarian', 'https://randomuser.me/api/portraits/men/6.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 10),
  ('dm7', 'Vivek Oberoi', 33, 'male', 'Hotel General Manager', 'Goa', 'Goa', 'BHM, IHM Goa', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', true, 183, 'Bengali', 'Vegetarian', 'https://randomuser.me/api/portraits/men/7.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 12),
  ('dm8', 'Manoj Tiwari', 36, 'male', 'Government Officer', 'Patna, Bihar', 'Patna', 'MA Public Admin, Patna University', 'Masters', 'Hindu', 'Brahmin', 'Widowed', false, 165, 'Urdu', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/8.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 14),
  ('dm9', 'Rohit Bhatia', 30, 'male', 'Mechanical Engineer', 'Ludhiana, Punjab', 'Ludhiana', 'B.Tech, PEC', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', true, 168, 'Hindi', 'Eggetarian', 'https://randomuser.me/api/portraits/men/9.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 16),
  ('dm10', 'Shantanu Ghosh', 29, 'male', 'Film Editor', 'Kolkata, West Bengal', 'Kolkata', 'B.Sc, Satyajit Ray Institute', 'Bachelors', 'Hindu', 'Kayastha', 'Never Married', true, 171, 'Punjabi', 'Vegetarian', 'https://randomuser.me/api/portraits/men/10.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 18),
  ('dm11', 'Irfan Sheikh', 35, 'male', 'Import-Export Trader', 'Surat, Gujarat', 'Surat', 'B.Com, VNSGU', 'Bachelors', 'Muslim', 'Sunni', 'Divorced', true, 174, 'Tamil', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/11.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 20),
  ('dm12', 'Nikhil Wadhwa', 26, 'male', 'UI/UX Designer', 'Gurugram, Haryana', 'Gurugram', 'B.Des, MIT Institute of Design', 'Bachelors', 'Hindu', 'Arora', 'Never Married', false, 177, 'Malayalam', 'Eggetarian', 'https://randomuser.me/api/portraits/men/12.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 1),
  ('dm13', 'Thomas Kutty', 32, 'male', 'Physiotherapist', 'Thiruvananthapuram, Kerala', 'Thiruvananthapuram', 'BPT, Kerala University', 'Bachelors', 'Christian', 'Syro-Malabar', 'Never Married', true, 180, 'Marathi', 'Vegetarian', 'https://randomuser.me/api/portraits/men/13.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 3),
  ('dm14', 'Yash Agnihotri', 28, 'male', 'Startup Founder', 'Indore, Madhya Pradesh', 'Indore', 'B.Tech, IIT Indore', 'Bachelors', 'Hindu', 'Brahmin', 'Never Married', true, 183, 'Gujarati', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/14.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 5),
  ('dm15', 'Devendra Solanki', 33, 'male', 'Civil Services Officer', 'Jaipur, Rajasthan', 'Jaipur', 'MA Economics, DU', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 165, 'Bengali', 'Eggetarian', 'https://randomuser.me/api/portraits/men/15.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 7),
  ('dm16', 'Aakash Chopra', 30, 'male', 'Sports Physiotherapist', 'Mohali, Punjab', 'Mohali', 'BPT, PGIMER', 'Bachelors', 'Hindu', 'Khatri', 'Never Married', false, 168, 'Urdu', 'Vegetarian', 'https://randomuser.me/api/portraits/men/16.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 9),
  ('dm17', 'Basil George', 31, 'male', 'Merchant Navy Officer', 'Kochi, Kerala', 'Kochi', 'B.Tech Marine, AMET', 'Bachelors', 'Christian', 'Catholic', 'Never Married', true, 171, 'Hindi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/17.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 11),
  ('dm18', 'Pranav Kulkarni', 27, 'male', 'Environmental Consultant', 'Pune, Maharashtra', 'Pune', 'M.Tech, COEP', 'Masters', 'Hindu', 'Deshastha', 'Never Married', true, 174, 'Punjabi', 'Eggetarian', 'https://randomuser.me/api/portraits/men/18.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 13),
  ('dm19', 'Ehsaan Qureshi', 34, 'male', 'Architect', 'Bhopal, Madhya Pradesh', 'Bhopal', 'B.Arch, SPA Bhopal', 'Bachelors', 'Muslim', 'Sunni', 'Divorced', false, 177, 'Tamil', 'Vegetarian', 'https://randomuser.me/api/portraits/men/19.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 15),
  ('dm20', 'Balvinder Sandhu', 29, 'male', 'Agri-Business Manager', 'Chandigarh, Punjab', 'Chandigarh', 'MBA Agribusiness, PAU', 'Masters', 'Sikh', 'Jat', 'Never Married', true, 180, 'Malayalam', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/men/20.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 17),
  ('df1', 'Kavya Subramaniam', 26, 'female', 'Biotechnologist', 'Chennai, Tamil Nadu', 'Chennai', 'M.Sc Biotech, VIT', 'Masters', 'Hindu', 'Iyengar', 'Never Married', true, 150, 'Hindi', 'Vegetarian', 'https://randomuser.me/api/portraits/women/1.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 0),
  ('df2', 'Simran Kaur Gill', 28, 'female', 'HR Manager', 'Chandigarh, Punjab', 'Chandigarh', 'MBA HR, PU', 'Masters', 'Sikh', 'Jat', 'Never Married', true, 153, 'Punjabi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/2.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 2),
  ('df3', 'Ayesha Siddiqui', 30, 'female', 'Pediatrician', 'Lucknow, Uttar Pradesh', 'Lucknow', 'MD Pediatrics, KGMU', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true, 156, 'Tamil', 'Eggetarian', 'https://randomuser.me/api/portraits/women/3.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 4),
  ('df4', 'Lakshmi Venkataraman', 27, 'female', 'Chartered Accountant', 'Chennai, Tamil Nadu', 'Chennai', 'CA, ICAI', 'Bachelors', 'Hindu', 'Iyer', 'Never Married', false, 159, 'Malayalam', 'Vegetarian', 'https://randomuser.me/api/portraits/women/4.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 6),
  ('df5', 'Riya D''Souza', 25, 'female', 'Air Hostess', 'Mumbai, Maharashtra', 'Mumbai', 'BA, St. Xavier''s College', 'Bachelors', 'Christian', 'Catholic', 'Never Married', true, 162, 'Marathi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/5.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 8),
  ('df6', 'Pooja Rathore', 29, 'female', 'Bank Officer', 'Jodhpur, Rajasthan', 'Jodhpur', 'MBA Finance, MDS University', 'Masters', 'Hindu', 'Rajput', 'Never Married', true, 165, 'Gujarati', 'Eggetarian', 'https://randomuser.me/api/portraits/women/6.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 10),
  ('df7', 'Neha Kapoor', 31, 'female', 'Interior Designer', 'Delhi, NCR', 'Delhi', 'B.Des, Pearl Academy', 'Bachelors', 'Hindu', 'Khatri', 'Divorced', false, 168, 'Bengali', 'Vegetarian', 'https://randomuser.me/api/portraits/women/7.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 12),
  ('df8', 'Swati Deshmukh', 26, 'female', 'Veterinarian', 'Nagpur, Maharashtra', 'Nagpur', 'BVSc, Nagpur Veterinary College', 'Bachelors', 'Hindu', 'Deshastha', 'Never Married', true, 150, 'Urdu', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/8.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 14),
  ('df9', 'Ipsita Mohanty', 28, 'female', 'Civil Services Officer', 'Bhubaneswar, Odisha', 'Bhubaneswar', 'MA Public Admin, Utkal University', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 153, 'Hindi', 'Eggetarian', 'https://randomuser.me/api/portraits/women/9.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 16),
  ('df10', 'Tanvi Bhargava', 24, 'female', 'Dentist', 'Jaipur, Rajasthan', 'Jaipur', 'BDS, RUHS', 'Bachelors', 'Hindu', 'Brahmin', 'Never Married', true, 156, 'Punjabi', 'Vegetarian', 'https://randomuser.me/api/portraits/women/10.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 18),
  ('df11', 'Farah Khan Lodhi', 32, 'female', 'School Principal', 'Bhopal, Madhya Pradesh', 'Bhopal', 'M.Ed, Barkatullah University', 'Masters', 'Muslim', 'Sunni', 'Widowed', false, 159, 'Tamil', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/11.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 20),
  ('df12', 'Aparna Warrier', 27, 'female', 'Ayurvedic Physician', 'Kochi, Kerala', 'Kochi', 'BAMS, Kerala University', 'Bachelors', 'Hindu', 'Nair', 'Never Married', true, 162, 'Malayalam', 'Eggetarian', 'https://randomuser.me/api/portraits/women/12.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 1),
  ('df13', 'Grace Thomas', 29, 'female', 'Speech Therapist', 'Bengaluru, Karnataka', 'Bengaluru', 'MSc Speech-Language Pathology, AIISH', 'Masters', 'Christian', 'Protestant', 'Never Married', true, 165, 'Marathi', 'Vegetarian', 'https://randomuser.me/api/portraits/women/13.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 3),
  ('df14', 'Manpreet Kaur Bedi', 30, 'female', 'Fashion Designer', 'Ludhiana, Punjab', 'Ludhiana', 'B.Des, NIFT', 'Bachelors', 'Sikh', 'Arora', 'Divorced', true, 168, 'Gujarati', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/14.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 5),
  ('df15', 'Diya Choudhary', 25, 'female', 'Journalist', 'Ahmedabad, Gujarat', 'Ahmedabad', 'MA Journalism, MICA', 'Masters', 'Hindu', 'Brahmin', 'Never Married', false, 150, 'Bengali', 'Eggetarian', 'https://randomuser.me/api/portraits/women/15.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 7),
  ('df16', 'Ruchika Malviya', 28, 'female', 'Investment Analyst', 'Indore, Madhya Pradesh', 'Indore', 'MBA Finance, IIM Indore', 'Masters', 'Hindu', 'Brahmin', 'Never Married', true, 153, 'Urdu', 'Vegetarian', 'https://randomuser.me/api/portraits/women/16.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 9),
  ('df17', 'Sana Merchant', 31, 'female', 'Radiologist', 'Surat, Gujarat', 'Surat', 'MD Radiology, GMERS', 'Doctorate', 'Muslim', 'Sunni', 'Never Married', true, 156, 'Hindi', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/17.jpg', 'A quiet reader who believes the best conversations happen over filter coffee. Family means everything to me, and I am looking for a partner who feels the same.', 11),
  ('df18', 'Christina Fernandes', 26, 'female', 'Marine Biologist', 'Panaji, Goa', 'Panaji', 'M.Sc Marine Biology, Goa University', 'Masters', 'Christian', 'Catholic', 'Never Married', true, 159, 'Punjabi', 'Eggetarian', 'https://randomuser.me/api/portraits/women/18.jpg', 'Ambitious at work, unhurried at home. Weekends are for trekking, old cinema, and cooking far too much food for two people.', 13),
  ('df19', 'Bhavna Rawal', 33, 'female', 'Corporate Lawyer', 'Dehradun, Uttarakhand', 'Dehradun', 'LLB, National Law University', 'Bachelors', 'Hindu', 'Rajput', 'Divorced', false, 162, 'Tamil', 'Vegetarian', 'https://randomuser.me/api/portraits/women/19.jpg', 'Raised in a close-knit traditional family, educated abroad, and comfortable in both worlds. Seeking someone kind, curious and equally rooted.', 15),
  ('df20', 'Amandeep Kaur Sethi', 27, 'female', 'Textile Designer', 'Amritsar, Punjab', 'Amritsar', 'B.Des Textiles, NIFT', 'Bachelors', 'Sikh', 'Jat', 'Never Married', true, 165, 'Malayalam', 'Non-Vegetarian', 'https://randomuser.me/api/portraits/women/20.jpg', 'I value honesty above almost everything. Looking for a companion for the long walk, not just the wedding photographs.', 17)
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
  ('s1', 'Gopal & Kanika', 5, 'We met on EverAfter and instantly clicked over our shared love for classical music and travel. The journey from our first conversation to our wedding day felt incredibly natural and meant to be. We are so grateful for this platform.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBvMsvTv7Y-CJGR0W6FxcXuL9Rvdc6lfpbrZsw2_YsC2Vzc5Hx09H_tWfQ0Alf5RU_uoM6irr0oBJVVij7lCWnhJiJd15zR1rLaPf9oJ14fgop5o8ye7-yy49NiGp6OFJ5Pg1og8mIxdYjb1nVST37BR4yC1yEzV6YfVT_nn55mgk49rjWju5FM-2iA_I7rF6hXqyLVj1qgGSw9ezOLH-7r0ZtKBF0eMN_Xnc648C32Z-XccKCzKgO9tqJUMxFdHsc7eYxoci1Uzaao'),
  ('s2', 'Priya & Vikram', 5, 'I was skeptical about online matchmaking until I found EverAfter. The detailed profiles helped me find someone who truly aligned with my values. Meeting Vikram changed my life forever.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuBmdxb9SZF3fJPRNF4Z7w9HLmseiZcvVRpAM2R0FsgzkVxEOs7LcCUig-QEAFAbEo3repteQ_dwY_-xNIpyi7IHX9nX5baB188KzfQZqDM28t1lWeASelnXxFKaNxTo8yMxM71dmuA4K4wl2LNLuWKs3Zt33GN8zYkUq3aqsDJb0JIUUmI6J2YGkskZYbUWCBFNCHbqx5x6ITCwDWmJ_N-1VIZDO14jqfVb2_ZeTeNDJ6B8qWyYgD26lki1UEweO9MPgC7N_tN5OLY3'),
  ('s3', 'Aditya & Sneha', 5, 'Both our families were involved from the very first conversation, which is exactly what we wanted. Three months later we were engaged, surrounded by everyone we love.', 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnp6Ddkwkj_UrTvVlynbOJ1nOUFJ4HprjUGIAkAtzrGGRpwDogp5k34Q8eADyfTbWS81-lZfjwXQ4Gq6hYn9G7mFyjc54FHo0z_HOZ4o5N273S7IS_ZX9xUZ3zWBtoRgd8-z1baJCE9VVGJXnTmz5ovP2ucGuIQ8_KtzB6QqmkkyevWAxuxP58VFHH2PCZanfa6sFGRIjMFosF3G0agMvrcYfYakdGdL_Lf8exzLt3VRxmgR2JFijhAjATJa3Ar2NW4tk_UAyJRTN-')
on conflict (id) do update set
  couple = excluded.couple,
  rating = excluded.rating,
  quote = excluded.quote,
  photo = excluded.photo;

-- Sanity check — should report 30 male and 34 female.
select gender, count(*) from profiles group by gender order by gender;
