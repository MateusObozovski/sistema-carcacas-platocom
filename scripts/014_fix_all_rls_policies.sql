-- Corrigir todas as políticas RLS que consultam profiles para evitar recursão infinita
-- Este script atualiza as políticas de clients, orders, core_returns, etc.

-- 1. Garantir que a função helper existe (do script 012)
-- Esta função precisa desabilitar RLS temporariamente para evitar recursão
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role text;
  rls_enabled boolean;
BEGIN
  -- Verificar se RLS está habilitado
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'profiles' AND relnamespace = 'public'::regnamespace;
  
  -- Desabilitar RLS temporariamente se estiver habilitado
  IF rls_enabled THEN
    ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
  END IF;
  
  -- Buscar role sem RLS
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  
  -- Reabilitar RLS se estava habilitado
  IF rls_enabled THEN
    ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  END IF;
  
  RETURN COALESCE(user_role, '');
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, tentar reabilitar RLS
    BEGIN
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    RETURN '';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

-- 2. Atualizar políticas de clients
DROP POLICY IF EXISTS "Vendedores can view their own clients" ON public.clients;
CREATE POLICY "Vendedores can view their own clients"
  ON public.clients FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

DROP POLICY IF EXISTS "Vendedores can update their own clients" ON public.clients;
CREATE POLICY "Vendedores can update their own clients"
  ON public.clients FOR UPDATE
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

-- 3. Atualizar políticas de orders
DROP POLICY IF EXISTS "Vendedores can view their own orders" ON public.orders;
CREATE POLICY "Vendedores can view their own orders"
  ON public.orders FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

DROP POLICY IF EXISTS "Vendedores can update their own orders" ON public.orders;
CREATE POLICY "Vendedores can update their own orders"
  ON public.orders FOR UPDATE
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

-- Atualizar políticas de order_items
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
CREATE POLICY "Users can view order items for their orders"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE id = order_items.order_id
      AND (
        vendedor_id = auth.uid()
        OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  );

-- 4. Atualizar políticas de core_returns
DROP POLICY IF EXISTS "Vendedores can view their own returns" ON public.core_returns;
CREATE POLICY "Vendedores can view their own returns"
  ON public.core_returns FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

-- 5. Verificar e atualizar role do admin
UPDATE public.profiles
SET 
  role = 'admin',
  nome = 'Admin',
  email = 'admin@teste.com',
  ativo = true
WHERE LOWER(email) = 'admin@teste.com';

-- 6. Verificar resultado
SELECT 
  'Profiles' as tabela,
  COUNT(*) as total,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins,
  COUNT(CASE WHEN role = 'Gerente' THEN 1 END) as gerentes,
  COUNT(CASE WHEN role = 'Coordenador' THEN 1 END) as coordenadores,
  COUNT(CASE WHEN role = 'Vendedor' THEN 1 END) as vendedores
FROM public.profiles;

