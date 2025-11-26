-- Solução SIMPLES para recursão infinita: remover políticas problemáticas e criar políticas mais simples
-- Esta abordagem evita recursão usando apenas auth.uid() sem consultar profiles

-- 1. Remover TODAS as políticas de profiles que causam recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coordenadores can view vendedores" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- 2. Criar política SIMPLES que permite qualquer usuário autenticado ver seu próprio profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- 3. Criar política que permite ver todos os profiles para usuários autenticados
-- Esta é uma solução temporária para evitar recursão
-- Em produção, você pode querer restringir isso baseado em roles, mas isso requer uma abordagem diferente
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 4. Manter política de update apenas para próprio profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 5. Corrigir role do admin
UPDATE public.profiles
SET 
  role = 'admin',
  nome = 'Admin',
  email = 'admin@teste.com',
  ativo = true
WHERE LOWER(email) = 'admin@teste.com';

-- 6. Verificar resultado
SELECT id, email, nome, role, ativo
FROM public.profiles
WHERE LOWER(email) = 'admin@teste.com';

-- 7. Verificar todas as políticas ativas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

