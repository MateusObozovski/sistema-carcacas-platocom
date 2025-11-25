-- Função para atualizar roles de "Patrão" para "admin"
-- Esta função pode ser chamada via RPC do Supabase

CREATE OR REPLACE FUNCTION public.update_patrao_to_admin()
RETURNS TABLE(updated_count integer, updated_profiles json)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_profiles json;
BEGIN
  -- Remover constraint temporariamente
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  
  -- Atualizar roles
  UPDATE public.profiles
  SET role = 'admin'
  WHERE role IN ('Patrão', 'patrão', 'Patrao', 'patrao', 'PATRÃO', 'PATRAO');
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  
  -- Recriar constraint
  ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor'));
  
  -- Buscar perfis atualizados
  SELECT json_agg(row_to_json(p))
  INTO v_profiles
  FROM (
    SELECT id, email, nome, role
    FROM public.profiles
    WHERE role = 'admin'
  ) p;
  
  RETURN QUERY SELECT v_count, v_profiles;
END;
$$;

-- Dar permissão para executar a função
GRANT EXECUTE ON FUNCTION public.update_patrao_to_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_patrao_to_admin() TO service_role;

