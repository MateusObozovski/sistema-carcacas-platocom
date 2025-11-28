-- Adicionar role "operador" ao sistema
-- Este script atualiza a constraint da tabela profiles para incluir a nova role "operador"

-- Remover constraint antiga
ALTER TABLE public.profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Recriar constraint com a nova role
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor', 'operador'));

-- Verificar se há alguma policy RLS que precisa ser atualizada
-- (As policies existentes devem continuar funcionando, pois não filtram por role específica)

