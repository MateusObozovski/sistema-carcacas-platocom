-- Corrigir políticas RLS para clients permitindo que todos os usuários autenticados possam criar clientes
-- e que admins, gerentes e coordenadores possam criar clientes para qualquer vendedor

-- Remover política antiga de INSERT
DROP POLICY IF EXISTS "Vendedores can insert clients" ON public.clients;

-- Criar nova política que permite:
-- 1. Vendedores criarem clientes para si mesmos
-- 2. Admins, Gerentes e Coordenadores criarem clientes para qualquer vendedor
CREATE POLICY "Authenticated users can insert clients"
  ON public.clients FOR INSERT
  WITH CHECK (
    -- Vendedor pode criar cliente para si mesmo
    vendedor_id = auth.uid()
    OR
    -- Admin, Gerente ou Coordenador pode criar cliente para qualquer vendedor
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

