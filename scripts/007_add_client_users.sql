-- Add Cliente role to profiles table and create client_users link table

-- Update profiles role constraint to include Cliente
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check 
  check (role in ('Patrão', 'Gerente', 'Coordenador', 'Vendedor', 'Cliente'));

-- Create table to link user profiles to clients
create table if not exists public.client_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamp with time zone default now(),
  unique(user_id, client_id)
);

-- Enable RLS
alter table public.client_users enable row level security;

-- Policies for client_users
create policy "Users can view their own client links"
  on public.client_users for select
  using (user_id = auth.uid());

create policy "Admins can view all client links"
  on public.client_users for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente', 'Coordenador')
    )
  );

-- Vendedores can create client users for their clients
create policy "Vendedores can create client users"
  on public.client_users for insert
  with check (
    exists (
      select 1 from public.clients
      where id = client_id
      and vendedor_id = auth.uid()
    )
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente')
    )
  );

-- Create index
create index if not exists idx_client_users_user on public.client_users(user_id);
create index if not exists idx_client_users_client on public.client_users(client_id);
