-- Create clients table
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text,
  telefone text,
  cnpj text,
  endereco text,
  vendedor_id uuid references public.profiles(id),
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.clients enable row level security;

-- Vendedores can only see their own clients
create policy "Vendedores can view their own clients"
  on public.clients for select
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente', 'Coordenador')
    )
  );

-- Vendedores can insert their own clients
create policy "Vendedores can insert clients"
  on public.clients for insert
  with check (vendedor_id = auth.uid());

-- Vendedores can update their own clients
create policy "Vendedores can update their own clients"
  on public.clients for update
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente', 'Coordenador')
    )
  );

-- Create index
create index if not exists idx_clients_vendedor on public.clients(vendedor_id);
