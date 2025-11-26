-- Script para limpar usuários e preparar para criação dos 4 usuários padrão
-- ATENÇÃO: Este script remove todos os profiles exceto os 4 padrão
-- Os usuários do Auth precisam ser criados manualmente no Dashboard ou via API

-- 1. Primeiro, vamos ver quais usuários existem (apenas para referência)
-- Descomente a linha abaixo para ver a lista antes de executar:
-- SELECT id, email, nome, role FROM public.profiles ORDER BY email;

-- 2. Remover todos os profiles que NÃO sejam os 4 usuários padrão
-- Isso vai manter apenas os 4 usuários padrão se eles já existirem
DELETE FROM public.profiles
WHERE LOWER(email) NOT IN (
  'admin@teste.com',
  'gerente@teste.com',
  'coordenador@teste.com',
  'vendedor@teste.com'
);

-- 3. Verificar quantos profiles restaram
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN LOWER(email) = 'admin@teste.com' THEN 1 END) as admin_exists,
  COUNT(CASE WHEN LOWER(email) = 'gerente@teste.com' THEN 1 END) as gerente_exists,
  COUNT(CASE WHEN LOWER(email) = 'coordenador@teste.com' THEN 1 END) as coordenador_exists,
  COUNT(CASE WHEN LOWER(email) = 'vendedor@teste.com' THEN 1 END) as vendedor_exists
FROM public.profiles;

-- 4. Se os profiles dos 4 usuários padrão não existirem, você precisará:
--    a) Criar os usuários no Supabase Dashboard (Authentication > Users > Add User)
--    b) Ou usar a API route /api/setup-clean-users (se tiver acesso admin)
--    c) Os profiles serão criados automaticamente pelo trigger quando os usuários forem criados

-- 5. Criar ou atualizar profiles para os 4 usuários padrão
-- Isso funciona mesmo se os usuários ainda não existirem no Auth (será criado quando o usuário for criado)

-- Admin
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'admin@teste.com', 'Admin', 'admin'
FROM auth.users
WHERE LOWER(email) = 'admin@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'admin@teste.com',
  nome = 'Admin',
  role = 'admin';

-- Gerente
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'gerente@teste.com', 'Gerente', 'Gerente'
FROM auth.users
WHERE LOWER(email) = 'gerente@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'gerente@teste.com',
  nome = 'Gerente',
  role = 'Gerente';

-- Coordenador
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'coordenador@teste.com', 'Coordenador', 'Coordenador'
FROM auth.users
WHERE LOWER(email) = 'coordenador@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'coordenador@teste.com',
  nome = 'Coordenador',
  role = 'Coordenador';

-- Vendedor
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'vendedor@teste.com', 'Vendedor', 'Vendedor'
FROM auth.users
WHERE LOWER(email) = 'vendedor@teste.com'
ON CONFLICT (id) DO UPDATE SET
  email = 'vendedor@teste.com',
  nome = 'Vendedor',
  role = 'Vendedor';

-- 6. Verificar resultado final
SELECT id, email, nome, role, ativo, created_at 
FROM public.profiles 
ORDER BY email;

