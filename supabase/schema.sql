-- Profiles table
create table if not exists profiles (
  user_id uuid references auth.users not null primary key,
  language_pref text check (language_pref in ('English', 'Standard Arabic', 'Egyptian Arabic')),
  theme_pref text check (theme_pref in ('Neon Cyberpunk', 'Clean Stealth')),
  ai_persona text check (ai_persona in ('Supportive AI', 'Aggressive Coach')),
  has_completed_tour boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Cups table
create table if not exists cups (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  status text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Tasks table
create table if not exists tasks (
  id uuid default gen_random_uuid() primary key,
  cup_id uuid references cups not null,
  parent_id uuid references tasks,
  title text not null,
  type text not null,
  is_completed boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table profiles enable row level security;
alter table cups enable row level security;
alter table tasks enable row level security;

-- RLS Policies
create policy "Users can view their own profile" on profiles for select using (auth.uid() = user_id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = user_id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = user_id);

create policy "Users can view their own cups" on cups for select using (auth.uid() = user_id);
create policy "Users can insert their own cups" on cups for insert with check (auth.uid() = user_id);
create policy "Users can update their own cups" on cups for update using (auth.uid() = user_id);

create policy "Users can view tasks of their own cups" on tasks for select using (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);
create policy "Users can insert tasks into their own cups" on tasks for insert with check (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);
create policy "Users can update tasks of their own cups" on tasks for update using (
  exists (select 1 from cups where cups.id = tasks.cup_id and cups.user_id = auth.uid())
);
