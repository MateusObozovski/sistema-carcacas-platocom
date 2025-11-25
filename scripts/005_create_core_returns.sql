-- Create core returns table to track carcaça returns
create table if not exists public.core_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade not null,
  cliente_id uuid references public.clients(id) not null,
  vendedor_id uuid references public.profiles(id) not null,
  valor_retornado numeric(10, 2) not null,
  data_retorno timestamp with time zone default now(),
  observacoes text,
  created_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.core_returns enable row level security;

-- Drop existing policies if they exist
drop policy if exists "Vendedores can view their own returns" on public.core_returns;
drop policy if exists "Vendedores can insert returns" on public.core_returns;

-- Vendedores can view their own returns
create policy "Vendedores can view their own returns"
  on public.core_returns for select
  using (
    vendedor_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Vendedores can insert their own returns
create policy "Vendedores can insert returns"
  on public.core_returns for insert
  with check (vendedor_id = auth.uid());

-- Create indexes
create index if not exists idx_core_returns_order on public.core_returns(order_id);
create index if not exists idx_core_returns_cliente on public.core_returns(cliente_id);
create index if not exists idx_core_returns_vendedor on public.core_returns(vendedor_id);
create index if not exists idx_core_returns_data on public.core_returns(data_retorno);

-- Function to update order status when return is registered
create or replace function handle_core_return()
returns trigger
language plpgsql
as $$
declare
  total_returned numeric;
  order_debt numeric;
begin
  -- Get total debt for the order
  select debito_carcaca into order_debt
  from public.orders
  where id = new.order_id;
  
  -- Get total already returned
  select coalesce(sum(valor_retornado), 0) into total_returned
  from public.core_returns
  where order_id = new.order_id;
  
  -- Update order status based on return amount
  if total_returned >= order_debt then
    update public.orders
    set status = 'Concluído',
        data_devolucao = new.data_retorno
    where id = new.order_id;
  end if;
  
  return new;
end;
$$;

-- Create trigger to auto-update order status
drop trigger if exists on_core_return_created on public.core_returns;

create trigger on_core_return_created
  after insert on public.core_returns
  for each row
  execute function handle_core_return();
