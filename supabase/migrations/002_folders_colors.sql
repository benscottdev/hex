-- Folders and colors synced per authenticated user (profiles.id = auth.users.id).

create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists folders_user_id_idx on public.folders (user_id);

create table if not exists public.colors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  folder_id uuid references public.folders(id) on delete cascade,
  folder_name text,
  hex text not null,
  name text,
  rgb jsonb not null,
  sampling text,
  mix jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists colors_user_id_idx on public.colors (user_id);
create index if not exists colors_folder_id_idx on public.colors (folder_id);
create index if not exists colors_user_created_idx on public.colors (user_id, created_at desc);

alter table public.folders enable row level security;
alter table public.colors enable row level security;

-- Folders
drop policy if exists "Users read own folders" on public.folders;
create policy "Users read own folders"
  on public.folders for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own folders" on public.folders;
create policy "Users insert own folders"
  on public.folders for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own folders" on public.folders;
create policy "Users update own folders"
  on public.folders for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own folders" on public.folders;
create policy "Users delete own folders"
  on public.folders for delete
  using (auth.uid() = user_id);

-- Colors
drop policy if exists "Users read own colors" on public.colors;
create policy "Users read own colors"
  on public.colors for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own colors" on public.colors;
create policy "Users insert own colors"
  on public.colors for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own colors" on public.colors;
create policy "Users update own colors"
  on public.colors for update
  using (auth.uid() = user_id);

drop policy if exists "Users delete own colors" on public.colors;
create policy "Users delete own colors"
  on public.colors for delete
  using (auth.uid() = user_id);
