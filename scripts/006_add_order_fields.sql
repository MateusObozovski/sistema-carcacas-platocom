-- Add numero_pedido_origem and empresa fields to orders table
alter table public.orders 
  add column if not exists numero_pedido_origem text,
  add column if not exists empresa text check (empresa in ('Platocom', 'R.D.C', 'Rita de Cássia', 'Tork', 'Thiago'));

-- Create index for empresa
create index if not exists idx_orders_empresa on public.orders(empresa);

