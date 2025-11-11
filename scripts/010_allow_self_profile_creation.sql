-- Allow users to create their own profile on first login
-- This fixes the chicken-and-egg problem where new users can't create profiles

-- Add policy to allow users to insert their own profile
create policy "Users can create own profile"
  on public.profiles for insert
  with check (auth.uid() = id);
