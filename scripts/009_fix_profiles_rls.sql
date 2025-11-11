-- Fix infinite recursion in profiles RLS policies
-- Drop existing policies
drop policy if exists "Users can view their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;
drop policy if exists "Patrão can insert profiles" on public.profiles;

-- Create a function to get user role (bypasses RLS)
create or replace function public.get_user_role(user_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role text;
begin
  select role into user_role
  from public.profiles
  where id = user_id;
  return user_role;
end;
$$;

-- Recreate policies without circular dependencies
-- Users can always view their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can view all profiles (using function to avoid recursion)
create policy "Admins can view all profiles"
  on public.profiles for select
  using (
    public.get_user_role(auth.uid()) in ('Patrão', 'Gerente', 'Coordenador')
  );

-- Users can update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Admins can update any profile
create policy "Admins can update profiles"
  on public.profiles for update
  using (
    public.get_user_role(auth.uid()) in ('Patrão', 'Gerente')
  );

-- Only Patrão can insert new profiles
create policy "Patrão can insert profiles"
  on public.profiles for insert
  with check (
    public.get_user_role(auth.uid()) = 'Patrão'
  );

-- Patrão can delete profiles
create policy "Patrão can delete profiles"
  on public.profiles for delete
  using (
    public.get_user_role(auth.uid()) = 'Patrão'
  );
