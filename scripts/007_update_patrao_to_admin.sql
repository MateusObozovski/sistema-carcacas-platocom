-- Script para atualizar role "Patrão" para "admin" na tabela profiles
-- Este script corrige os dados existentes que ainda usam o formato antigo

-- Primeiro, remover temporariamente a constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Atualizar todos os registros com role "Patrão" para "admin"
UPDATE public.profiles
SET role = 'admin'
WHERE role = 'Patrão';

-- Verificar se há outros formatos que precisam ser atualizados
UPDATE public.profiles
SET role = 'admin'
WHERE LOWER(TRIM(role)) IN ('patrão', 'patrao', 'Patrão', 'Patrao', 'PATRÃO', 'PATRAO');

-- Recriar a constraint com os valores corretos
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor'));

-- Verificar os resultados (comentado para não executar em produção sem revisão)
-- SELECT id, email, nome, role FROM public.profiles WHERE role = 'admin';

