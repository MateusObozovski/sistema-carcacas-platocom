-- Create products table
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  marca text not null,
  tipo text not null,
  categoria text not null,
  aplicacao text,
  diametro text,
  codigo_fabrica text,
  codigo_sachs text,
  preco_base numeric(10, 2) not null,
  desconto_maximo_bt numeric(5, 2) default 15,
  ativo boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Enable RLS
alter table public.products enable row level security;

-- Everyone can view active products
create policy "Anyone can view active products"
  on public.products for select
  using (ativo = true);

-- Only admins can insert/update/delete products
create policy "Admins can manage products"
  on public.products for all
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
      and role in ('Patrão', 'Gerente')
    )
  );

-- Create index for faster searches
create index if not exists idx_products_marca on public.products(marca);
create index if not exists idx_products_tipo on public.products(tipo);
create index if not exists idx_products_categoria on public.products(categoria);
create index if not exists idx_products_ativo on public.products(ativo);
