-- Atualizar política RLS de products para permitir que admin, Gerente e Coordenador possam criar/editar/excluir produtos
-- Apenas Vendedor não pode gerenciar produtos
-- Usando a função helper get_user_role para evitar recursão infinita

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

-- Remover política antiga
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins, Gerentes e Coordenadores can manage products" ON public.products;

-- Criar nova política que permite admin, Gerente e Coordenador gerenciar produtos
-- Usando a função helper para evitar recursão
CREATE POLICY "Admins, Gerentes e Coordenadores can manage products"
  ON public.products FOR ALL
  USING (
    public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador')
  );

-- Verificar políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'products'
ORDER BY policyname;

