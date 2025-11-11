-- Create orders table
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  numero_pedido text unique not null,
  cliente_id uuid references public.clients(id) not null,
  vendedor_id uuid references public.profiles(id) not null,
  tipo_venda text not null check (tipo_venda in ('Normal', 'Base de Troca')),
  valor_total numeric(10, 2) not null,
  debito_carcaca numeric(10, 2) default 0,
  status text not null default 'Concluído' check (status in ('Aguardando Devolução', 'Concluído', 'Atrasado', 'Perda Total')),
  data_venda timestamp with time zone default now(),
  data_devolucao timestamp with time zone,
  observacoes text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create order items table
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  produto_id uuid references public.products(id) not null,
  produto_nome text not null,
  quantidade integer not null default 1,
  preco_unitario numeric(10, 2) not null,
  desconto_percentual numeric(5, 2) default 0,
  preco_final numeric(10, 2) not null,
  debito_carcaca numeric(10, 2) default 0,
  tipo_venda text not null check (tipo_venda in ('Normal', 'Base de Troca')),
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Vendedores can only see their own orders
create policy "Vendedores can view their own orders"
  on public.orders for select
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente', 'Coordenador')
    )
  );

-- Vendedores can insert their own orders
create policy "Vendedores can insert orders"
  on public.orders for insert
  with check (vendedor_id = auth.uid());

-- Vendedores can update their own orders
create policy "Vendedores can update their own orders"
  on public.orders for update
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente', 'Coordenador')
    )
  );

-- Order items policies
create policy "Users can view order items for their orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
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

create policy "Users can insert order items for their orders"
  on public.order_items for insert
  with check (
    exists (
      select 1 from public.orders
      where id = order_items.order_id
      and vendedor_id = auth.uid()
    )
  );

-- Create indexes
create index if not exists idx_orders_vendedor on public.orders(vendedor_id);
create index if not exists idx_orders_cliente on public.orders(cliente_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_numero on public.orders(numero_pedido);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- Function to generate order number
create or replace function generate_order_number()
returns text
language plpgsql
as $$
declare
  year text;
  next_num integer;
  order_num text;
begin
  year := to_char(now(), 'YYYY');
  
  select coalesce(max(cast(substring(numero_pedido from 10) as integer)), 0) + 1
  into next_num
  from public.orders
  where numero_pedido like '#PED-' || year || '-%';
  
  order_num := '#PED-' || year || '-' || lpad(next_num::text, 4, '0');
  return order_num;
end;
$$;
