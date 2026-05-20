
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  partner_name text,
  relationship_start_date date,
  avatar_url text,
  partner_avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- pin codes
create table public.pin_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pin_codes enable row level security;
create policy "own pin select" on public.pin_codes for select using (auth.uid() = user_id);
create policy "own pin insert" on public.pin_codes for insert with check (auth.uid() = user_id);
create policy "own pin update" on public.pin_codes for update using (auth.uid() = user_id);
create policy "own pin delete" on public.pin_codes for delete using (auth.uid() = user_id);

-- memories
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  note text not null default '',
  memory_date date not null default current_date,
  mood text default '',
  tags text[] not null default '{}',
  is_favorite boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_user_id_date_idx on public.memories(user_id, memory_date desc);
alter table public.memories enable row level security;
create policy "own memories select" on public.memories for select using (auth.uid() = user_id);
create policy "own memories insert" on public.memories for insert with check (auth.uid() = user_id);
create policy "own memories update" on public.memories for update using (auth.uid() = user_id);
create policy "own memories delete" on public.memories for delete using (auth.uid() = user_id);

-- memory images
create table public.memory_images (
  id uuid primary key default gen_random_uuid(),
  memory_id uuid not null references public.memories(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);
create index memory_images_memory_idx on public.memory_images(memory_id);
alter table public.memory_images enable row level security;
create policy "own images select" on public.memory_images for select using (auth.uid() = user_id);
create policy "own images insert" on public.memory_images for insert with check (auth.uid() = user_id);
create policy "own images update" on public.memory_images for update using (auth.uid() = user_id);
create policy "own images delete" on public.memory_images for delete using (auth.uid() = user_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger pin_codes_updated before update on public.pin_codes
for each row execute function public.set_updated_at();
create trigger memories_updated before update on public.memories
for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- storage bucket
insert into storage.buckets (id, name, public) values ('memory-images', 'memory-images', false)
on conflict (id) do nothing;

create policy "own images storage select" on storage.objects for select
using (bucket_id = 'memory-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own images storage insert" on storage.objects for insert
with check (bucket_id = 'memory-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own images storage update" on storage.objects for update
using (bucket_id = 'memory-images' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "own images storage delete" on storage.objects for delete
using (bucket_id = 'memory-images' and auth.uid()::text = (storage.foldername(name))[1]);
