-- Corrigir recursão infinita na política RLS de profiles
-- O problema é que a política verifica a tabela profiles dentro de si mesma

-- Remover políticas problemáticas
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view all profiles" ON public.profiles;

-- Criar política que usa auth.uid() diretamente sem consultar profiles
-- Esta política permite que qualquer usuário autenticado veja profiles de vendedores
-- e permite que admins/gerentes vejam todos (usando uma função helper)

-- Primeiro, criar uma função helper que verifica o role sem causar recursão
-- Usa SECURITY DEFINER para bypass RLS e evitar recursão
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
  -- Desabilitar RLS temporariamente para esta consulta
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id
  LIMIT 1;
  
  RETURN COALESCE(user_role, '');
END;
$$;

-- Política para usuários verem seu próprio profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Política para admins verem todos os profiles (sem recursão)
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'admin'
  );

-- Política para gerentes verem todos os profiles
CREATE POLICY "Gerentes can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'Gerente'
  );

-- Política para coordenadores verem profiles de vendedores
CREATE POLICY "Coordenadores can view vendedores"
  ON public.profiles FOR SELECT
  USING (
    public.get_user_role(auth.uid()) = 'Coordenador'
    AND role = 'Vendedor'
  );

-- Grant execute na função
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO anon;

