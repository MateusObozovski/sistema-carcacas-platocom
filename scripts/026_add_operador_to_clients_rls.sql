-- Atualizar políticas RLS para permitir que operadores vejam todos os clientes
-- Isso é necessário para que operadores possam criar entradas de mercadoria

-- 1. Atualizar política de SELECT para incluir operador
DROP POLICY IF EXISTS "Vendedores can view their own clients" ON public.clients;
CREATE POLICY "Vendedores can view their own clients"
  ON public.clients FOR SELECT
  USING (
    vendedor_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('admin', 'Gerente', 'Coordenador', 'operador')
  );

-- Verificar resultado
SELECT 
  'Clients RLS Policy Updated' as status,
  'Operadores now have SELECT access to all clients' as message;
