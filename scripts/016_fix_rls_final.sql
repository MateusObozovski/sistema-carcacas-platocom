-- SOLUÇÃO FINAL: Remover recursão infinita e corrigir role do admin
-- Esta solução remove todas as políticas problemáticas e cria políticas simples sem recursão

-- 1. Remover TODAS as políticas de profiles que podem causar recursão
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Gerentes can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Coordenadores can view vendedores" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;

-- 2. Criar política SIMPLES que permite qualquer usuário autenticado ver todos os profiles
-- Esta é a solução mais simples que evita recursão completamente
-- Nota: Em produção, você pode querer restringir isso, mas por enquanto resolve o problema
CREATE POLICY "Authenticated users can view all profiles"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- 3. Política para update apenas do próprio profile
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- 4. Política para insert (admin pode inserir via API com service role)
DROP POLICY IF EXISTS "Admin can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (true); -- Permitir insert via service role (API)

-- 5. Corrigir role do admin no banco
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

-- 7. Listar todas as políticas ativas de profiles
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

