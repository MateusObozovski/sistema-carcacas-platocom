-- Script para verificar e corrigir profiles dos usuários
-- Execute este script após criar os usuários no Dashboard

-- 1. Verificar quais usuários existem no Auth mas não têm profile
SELECT 
  u.id,
  u.email as auth_email,
  u.email_confirmed_at,
  p.id as profile_id,
  p.email as profile_email,
  p.nome,
  p.role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE LOWER(u.email) IN (
  'admin@teste.com',
  'gerente@teste.com',
  'coordenador@teste.com',
  'vendedor@teste.com'
)
ORDER BY u.email;

-- 2. Criar profiles para usuários que não têm (se necessário)
-- Admin
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'admin@teste.com', 'Admin', 'admin'
FROM auth.users
WHERE LOWER(email) = 'admin@teste.com'
  AND id NOT IN (SELECT id FROM public.profiles WHERE LOWER(email) = 'admin@teste.com')
ON CONFLICT (id) DO NOTHING;

-- Gerente
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'gerente@teste.com', 'Gerente', 'Gerente'
FROM auth.users
WHERE LOWER(email) = 'gerente@teste.com'
  AND id NOT IN (SELECT id FROM public.profiles WHERE LOWER(email) = 'gerente@teste.com')
ON CONFLICT (id) DO NOTHING;

-- Coordenador
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'coordenador@teste.com', 'Coordenador', 'Coordenador'
FROM auth.users
WHERE LOWER(email) = 'coordenador@teste.com'
  AND id NOT IN (SELECT id FROM public.profiles WHERE LOWER(email) = 'coordenador@teste.com')
ON CONFLICT (id) DO NOTHING;

-- Vendedor
INSERT INTO public.profiles (id, email, nome, role)
SELECT id, 'vendedor@teste.com', 'Vendedor', 'Vendedor'
FROM auth.users
WHERE LOWER(email) = 'vendedor@teste.com'
  AND id NOT IN (SELECT id FROM public.profiles WHERE LOWER(email) = 'vendedor@teste.com')
ON CONFLICT (id) DO NOTHING;

-- 3. Atualizar profiles existentes com dados corretos
UPDATE public.profiles
SET 
  nome = 'Admin',
  role = 'admin',
  email = 'admin@teste.com',
  ativo = true
WHERE LOWER(email) = 'admin@teste.com';

UPDATE public.profiles
SET 
  nome = 'Gerente',
  role = 'Gerente',
  email = 'gerente@teste.com',
  ativo = true
WHERE LOWER(email) = 'gerente@teste.com';

UPDATE public.profiles
SET 
  nome = 'Coordenador',
  role = 'Coordenador',
  email = 'coordenador@teste.com',
  ativo = true
WHERE LOWER(email) = 'coordenador@teste.com';

UPDATE public.profiles
SET 
  nome = 'Vendedor',
  role = 'Vendedor',
  email = 'vendedor@teste.com',
  ativo = true
WHERE LOWER(email) = 'vendedor@teste.com';

-- 4. Verificar se os emails estão confirmados no Auth
-- Se não estiverem, você precisa confirmá-los no Dashboard
SELECT 
  id,
  email,
  email_confirmed_at,
  CASE 
    WHEN email_confirmed_at IS NULL THEN 'NÃO CONFIRMADO - Precisa confirmar no Dashboard'
    ELSE 'Confirmado'
  END as status
FROM auth.users
WHERE LOWER(email) IN (
  'admin@teste.com',
  'gerente@teste.com',
  'coordenador@teste.com',
  'vendedor@teste.com'
)
ORDER BY email;

-- 5. Verificar resultado final - todos os profiles devem estar corretos
SELECT 
  p.id,
  p.email,
  p.nome,
  p.role,
  p.ativo,
  u.email_confirmed_at,
  CASE 
    WHEN u.email_confirmed_at IS NULL THEN '⚠️ Email não confirmado'
    WHEN p.ativo = false THEN '⚠️ Profile inativo'
    ELSE '✅ OK'
  END as status
FROM public.profiles p
INNER JOIN auth.users u ON p.id = u.id
WHERE LOWER(p.email) IN (
  'admin@teste.com',
  'gerente@teste.com',
  'coordenador@teste.com',
  'vendedor@teste.com'
)
ORDER BY p.email;

