-- Create core returns history table
create table if not exists public.core_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  data_devolucao timestamp with time zone default now(),
  observacoes text,
  registrado_por uuid references public.profiles(id) not null,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.core_returns enable row level security;

-- Users can view core returns for orders they have access to
create policy "Users can view core returns for accessible orders"
  on public.core_returns for select
  using (
    exists (
      select 1 from public.orders
      where id = core_returns.order_id
      and (
        vendedor_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where id = auth.uid()
          and role in ('Patrão', 'Gerente', 'Coordenador')
        )
      )
    )
  );

-- Users can insert core returns
create policy "Users can insert core returns"
  on public.core_returns for insert
  with check (registrado_por = auth.uid());

-- Create index
create index if not exists idx_core_returns_order on public.core_returns(order_id);
