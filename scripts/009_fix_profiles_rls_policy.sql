-- Corrigir política RLS para permitir que admins vejam todos os profiles
-- A política atual usa auth.jwt()->>'role' que não funciona porque o JWT não contém o role do profile

-- Remover política antiga
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Criar nova política que verifica diretamente na tabela profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'admin'
    )
  );

-- Também permitir que Gerentes vejam todos os profiles
CREATE POLICY "Gerentes can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role = 'Gerente'
    )
  );

