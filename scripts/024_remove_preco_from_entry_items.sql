-- Tornar preco_unitario opcional na tabela merchandise_entry_items
-- Este script atualiza a coluna para permitir valores NULL

-- Alterar coluna para permitir NULL
ALTER TABLE public.merchandise_entry_items
  ALTER COLUMN preco_unitario DROP NOT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.merchandise_entry_items.preco_unitario IS 'Preço unitário do item (opcional, pode ser NULL)';

