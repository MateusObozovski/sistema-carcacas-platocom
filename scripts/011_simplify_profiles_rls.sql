-- Drop ALL existing policies on profiles table
do $$ 
declare
  pol record;
begin
  for pol in 
    select policyname 
    from pg_policies 
    where tablename = 'profiles' and schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.profiles', pol.policyname);
  end loop;
end $$;

-- Drop function with CASCADE to remove all dependencies
drop function if exists public.get_user_role(uuid) cascade;

-- Create simple, non-recursive policies
-- Allow users to read their own profile
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

-- Allow users to insert their own profile (for first-time login)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Allow users to update their own profile
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- For admin access, we'll handle it via service role in API routes
-- This avoids any circular dependencies in RLS policies
