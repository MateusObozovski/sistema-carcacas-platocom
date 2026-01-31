-- Migration: Portal do Cliente
-- Adiciona campos e tabelas necessárias para o portal do cliente

-- Adicionar campos na tabela clients para controle do portal
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS codigo_acesso VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS portal_habilitado BOOLEAN DEFAULT false;

-- Criar índice para código de acesso
CREATE INDEX IF NOT EXISTS idx_clients_codigo_acesso ON clients(codigo_acesso);

-- Criar tabela client_users para vincular usuários a clientes
CREATE TABLE IF NOT EXISTS client_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- Criar índices para client_users
CREATE INDEX IF NOT EXISTS idx_client_users_user_id ON client_users(user_id);
CREATE INDEX IF NOT EXISTS idx_client_users_client_id ON client_users(client_id);

-- Habilitar RLS na tabela client_users
ALTER TABLE client_users ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para client_users
-- Admins, Gerentes e Coordenadores podem ver tudo
CREATE POLICY "Admins can manage client_users" ON client_users
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- Clientes podem ver apenas sua própria vinculação
CREATE POLICY "Clients can view own link" ON client_users
FOR SELECT
USING (user_id = auth.uid());

-- Políticas RLS para clients - permitir que clientes vejam seus próprios dados
CREATE POLICY "Clients can view own data" ON clients
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = clients.id
    AND client_users.user_id = auth.uid()
  )
);

-- Políticas RLS para orders - permitir que clientes vejam seus próprios pedidos
CREATE POLICY "Clients can view own orders" ON orders
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM client_users
    WHERE client_users.client_id = orders.cliente_id
    AND client_users.user_id = auth.uid()
  )
);

-- Políticas RLS para order_items - permitir que clientes vejam itens dos seus pedidos
CREATE POLICY "Clients can view own order_items" ON order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN client_users ON client_users.client_id = orders.cliente_id
    WHERE orders.id = order_items.order_id
    AND client_users.user_id = auth.uid()
  )
);

-- Comentários
COMMENT ON COLUMN clients.codigo_acesso IS 'Código único para login do cliente no portal';
COMMENT ON COLUMN clients.portal_habilitado IS 'Se o cliente tem acesso ao portal habilitado';
COMMENT ON TABLE client_users IS 'Vinculação entre usuários do sistema e clientes para acesso ao portal';
