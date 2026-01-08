-- Atualizar políticas RLS para permitir que operadores vejam TODAS as entradas de mercadoria
-- Isso permite que operadores tenham visibilidade completa das entradas, não apenas as suas

-- 1. Atualizar política de SELECT para merchandise_entries
DROP POLICY IF EXISTS "Operadores can view their own entries" ON public.merchandise_entries;
CREATE POLICY "Users can view entries"
  ON public.merchandise_entries FOR SELECT
  USING (
    -- Operadores, Admin, Gerente, Coordenador e Vendedor veem todas as entradas
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor', 'operador')
    )
  );

-- 2. Atualizar política de SELECT para merchandise_entry_items
DROP POLICY IF EXISTS "Users can view entry items" ON public.merchandise_entry_items;
CREATE POLICY "Users can view entry items"
  ON public.merchandise_entry_items FOR SELECT
  USING (
    -- Operadores, Admin, Gerente, Coordenador e Vendedor veem todos os itens
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor', 'operador')
    )
  );

-- Verificar resultado
SELECT 
  'Merchandise Entries RLS Policies Updated' as status,
  'Operadores now have SELECT access to all merchandise entries and items' as message;
