-- Create profiles table that extends auth.users with role information
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  nome text not null,
  role text not null check (role in ('admin', 'Gerente', 'Coordenador', 'Vendedor')),
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Fixed infinite recursion by using auth.jwt() instead of querying profiles table
-- Drop existing policies if they exist
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Admin can insert profiles" on public.profiles;
drop policy if exists "Service role can do everything" on public.profiles;

-- Users can view their own profile
create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admin users (admin, Gerente) can view all profiles using JWT claims
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    (auth.jwt()->>'role')::text in ('admin', 'Gerente')
  );

-- Only admin can insert new profiles using JWT claims
create policy "Admin can insert profiles"
  on public.profiles for insert
  with check (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- Service role can do everything (for triggers and API)
create policy "Service role can do everything"
  on public.profiles for all
  using (auth.jwt()->>'role' = 'service_role');

-- Create trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, nome, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', 'Novo Usuário'),
    coalesce(new.raw_user_meta_data->>'role', 'Vendedor')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
