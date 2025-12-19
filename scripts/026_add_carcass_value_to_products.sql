-- Adicionar coluna carcass_value na tabela products
alter table public.products 
add column if not exists carcass_value numeric(10, 2) default 0;

-- Comentário para documentação
comment on column public.products.carcass_value is 'Valor fixo da carcaça em reais que representa o desconto máximo permitido para este produto';
