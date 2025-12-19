-- Adicionar coluna retained_revenue_carcass na tabela order_items
alter table public.order_items 
add column if not exists retained_revenue_carcass numeric(10, 2) default 0;

-- Comentário para documentação
comment on column public.order_items.retained_revenue_carcass is 'Valor gerado (lucro) na negociação da carcaça: carcass_value - desconto_real_concedido';
