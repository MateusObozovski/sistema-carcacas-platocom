-- Add photo support for core returns

-- Create table for return photos
create table if not exists public.return_photos (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid references public.order_items(id) on delete cascade,
  photo_url text not null,
  uploaded_by uuid references public.profiles(id),
  uploaded_at timestamp with time zone default now(),
  observacoes text
);

-- Enable RLS
alter table public.return_photos enable row level security;

-- Policies
-- Fixed column name from client_id to cliente_id to match orders table schema
create policy "Users can view photos for their orders"
  on public.return_photos for select
  using (
    exists (
      select 1 from public.orders o
      left join public.clients c on o.cliente_id = c.id
      left join public.client_users cu on cu.client_id = c.id
      where o.id = order_id
      and (
        o.vendedor_id = auth.uid()
        or cu.user_id = auth.uid()
        or exists (
          select 1 from public.profiles
          where id = auth.uid()
          and role in ('Patrão', 'Gerente', 'Coordenador')
        )
      )
    )
  );

create policy "Clients and vendedores can upload photos"
  on public.return_photos for insert
  with check (
    exists (
      select 1 from public.orders o
      left join public.clients c on o.cliente_id = c.id
      left join public.client_users cu on cu.client_id = c.id
      where o.id = order_id
      and (
        o.vendedor_id = auth.uid()
        or cu.user_id = auth.uid()
      )
    )
  );

-- Create index
create index if not exists idx_return_photos_order on public.return_photos(order_id);
