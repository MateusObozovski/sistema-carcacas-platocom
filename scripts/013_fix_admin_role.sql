-- Corrigir role do usuário admin@teste.com
-- Atualizar para garantir que está como 'admin'

UPDATE public.profiles
SET 
  role = 'admin',
  nome = 'Admin',
  email = 'admin@teste.com',
  ativo = true
WHERE LOWER(email) = 'admin@teste.com';

-- Verificar resultado
SELECT id, email, nome, role, ativo
FROM public.profiles
WHERE LOWER(email) = 'admin@teste.com';

