-- Ajustar política RLS para UPDATE em order_items
-- Permitir que usuários com roles apropriadas possam atualizar debito_carcaca para vincular entradas

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can update order items for their orders" ON public.order_items;

-- Criar política de UPDATE mais permissiva para order_items
-- Permite atualização para vincular entradas de mercadoria
CREATE POLICY "Users can update order items for linking"
  ON public.order_items FOR UPDATE
  USING (
    -- Admin, Gerente, Coordenador e Vendedor podem atualizar para vincular entradas
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
    OR
    -- Vendedor pode atualizar itens de seus próprios pedidos
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND vendedor_id = auth.uid()
    )
  )
  WITH CHECK (
    -- Mesmas condições para WITH CHECK
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
    OR
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND vendedor_id = auth.uid()
    )
  );

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

