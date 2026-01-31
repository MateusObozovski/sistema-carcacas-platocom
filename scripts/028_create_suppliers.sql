-- Script 028: Criar tabela de fornecedores
-- Data: 2026-01-30

-- Criar tabela suppliers (fornecedores)
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  celular TEXT,
  email TEXT,
  endereco TEXT,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_suppliers_nome ON suppliers(nome);
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj);
CREATE INDEX IF NOT EXISTS idx_suppliers_ativo ON suppliers(ativo);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- Habilitar RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para suppliers
-- Admins e Gerentes podem ver todos os fornecedores
DROP POLICY IF EXISTS "suppliers_select_policy" ON suppliers;
CREATE POLICY "suppliers_select_policy" ON suppliers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Admins e Gerentes podem inserir fornecedores
DROP POLICY IF EXISTS "suppliers_insert_policy" ON suppliers;
CREATE POLICY "suppliers_insert_policy" ON suppliers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente')
    )
  );

-- Admins e Gerentes podem atualizar fornecedores
DROP POLICY IF EXISTS "suppliers_update_policy" ON suppliers;
CREATE POLICY "suppliers_update_policy" ON suppliers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente')
    )
  );

-- Admins podem deletar fornecedores
DROP POLICY IF EXISTS "suppliers_delete_policy" ON suppliers;
CREATE POLICY "suppliers_delete_policy" ON suppliers
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comentários
COMMENT ON TABLE suppliers IS 'Tabela de fornecedores';
COMMENT ON COLUMN suppliers.id IS 'ID único do fornecedor';
COMMENT ON COLUMN suppliers.nome IS 'Nome/Razão social do fornecedor';
COMMENT ON COLUMN suppliers.cnpj IS 'CNPJ do fornecedor';
COMMENT ON COLUMN suppliers.telefone IS 'Telefone fixo';
COMMENT ON COLUMN suppliers.celular IS 'Telefone celular';
COMMENT ON COLUMN suppliers.email IS 'Email de contato';
COMMENT ON COLUMN suppliers.endereco IS 'Endereço completo';
COMMENT ON COLUMN suppliers.observacoes IS 'Observações gerais';
COMMENT ON COLUMN suppliers.ativo IS 'Se o fornecedor está ativo';
