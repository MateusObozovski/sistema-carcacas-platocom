-- Adicionar política RLS para UPDATE em order_items
-- Permite que usuários atualizem order_items se puderem atualizar o pedido associado

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can update order items for their orders" ON public.order_items;

-- Criar política de UPDATE para order_items
CREATE POLICY "Users can update order items for their orders"
  ON public.order_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (
        -- Vendedor pode atualizar itens de seus próprios pedidos
        vendedor_id = auth.uid()
        OR
        -- Admin, Gerente ou Coordenador pode atualizar itens de qualquer pedido
        public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (
        -- Vendedor pode atualizar itens de seus próprios pedidos
        vendedor_id = auth.uid()
        OR
        -- Admin, Gerente ou Coordenador pode atualizar itens de qualquer pedido
        public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  );

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'order_items'
ORDER BY policyname;

