-- Corrigir políticas RLS para orders permitindo que todos os usuários autenticados possam criar pedidos
-- Vendedores podem criar pedidos para si mesmos
-- Admins, Gerentes e Coordenadores podem criar pedidos para qualquer vendedor

-- Verificar se a função helper existe, se não, criar
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- SECURITY DEFINER bypassa RLS, evitando recursão
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN COALESCE(user_role, '');
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Vendedores can insert orders" ON public.orders;

-- Criar nova política que permite:
-- 1. Vendedores criarem pedidos para si mesmos
-- 2. Admins, Gerentes e Coordenadores criarem pedidos para qualquer vendedor
CREATE POLICY "Authenticated users can insert orders"
  ON public.orders FOR INSERT
  WITH CHECK (
    -- Vendedor pode criar pedido para si mesmo
    vendedor_id = auth.uid()
    OR
    -- Admin, Gerente ou Coordenador pode criar pedido para qualquer vendedor
    public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

-- Atualizar política de INSERT para order_items também
DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;

CREATE POLICY "Users can insert order items for their orders"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (
        -- Vendedor pode inserir itens em seus próprios pedidos
        vendedor_id = auth.uid()
        OR
        -- Admin, Gerente ou Coordenador pode inserir itens em qualquer pedido
        public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  );

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('orders', 'order_items')
ORDER BY tablename, policyname;

