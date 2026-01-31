-- Script 029: Criar tabelas de notas fiscais de compra
-- Data: 2026-01-30

-- Criar tabela purchase_invoices (notas fiscais de compra)
CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE RESTRICT NOT NULL,
  numero_nota TEXT NOT NULL,
  data_nota TIMESTAMP WITH TIME ZONE NOT NULL,
  data_vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('Pendente', 'Pago', 'Vencido')) DEFAULT 'Pendente' NOT NULL,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  forma_pagamento TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar tabela purchase_invoice_items (itens da nota fiscal)
CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID REFERENCES purchase_invoices(id) ON DELETE CASCADE NOT NULL,
  produto_id UUID REFERENCES products(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Criar índices para purchase_invoices
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_supplier ON purchase_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_status ON purchase_invoices(status);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_data_vencimento ON purchase_invoices(data_vencimento);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_created_by ON purchase_invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_purchase_invoices_numero ON purchase_invoices(numero_nota);

-- Criar índices para purchase_invoice_items
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_invoice ON purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_purchase_invoice_items_produto ON purchase_invoice_items(produto_id);

-- Criar função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_purchase_invoices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para updated_at
DROP TRIGGER IF EXISTS update_purchase_invoices_updated_at ON purchase_invoices;
CREATE TRIGGER update_purchase_invoices_updated_at
  BEFORE UPDATE ON purchase_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_purchase_invoices_updated_at();

-- Habilitar RLS
ALTER TABLE purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para purchase_invoices
-- Admins, Gerentes e Coordenadores podem ver todas as notas
DROP POLICY IF EXISTS "purchase_invoices_select_policy" ON purchase_invoices;
CREATE POLICY "purchase_invoices_select_policy" ON purchase_invoices
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Admins, Gerentes e Coordenadores podem inserir notas
DROP POLICY IF EXISTS "purchase_invoices_insert_policy" ON purchase_invoices;
CREATE POLICY "purchase_invoices_insert_policy" ON purchase_invoices
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Admins e Gerentes podem atualizar notas (marcar como pago)
DROP POLICY IF EXISTS "purchase_invoices_update_policy" ON purchase_invoices;
CREATE POLICY "purchase_invoices_update_policy" ON purchase_invoices
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente')
    )
  );

-- Admins podem deletar notas
DROP POLICY IF EXISTS "purchase_invoices_delete_policy" ON purchase_invoices;
CREATE POLICY "purchase_invoices_delete_policy" ON purchase_invoices
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Políticas RLS para purchase_invoice_items
-- Quem pode ver a nota pode ver os itens
DROP POLICY IF EXISTS "purchase_invoice_items_select_policy" ON purchase_invoice_items;
CREATE POLICY "purchase_invoice_items_select_policy" ON purchase_invoice_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM purchase_invoices pi
      JOIN profiles p ON p.id = auth.uid()
      WHERE pi.id = purchase_invoice_items.invoice_id
      AND p.role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Quem pode inserir nota pode inserir itens
DROP POLICY IF EXISTS "purchase_invoice_items_insert_policy" ON purchase_invoice_items;
CREATE POLICY "purchase_invoice_items_insert_policy" ON purchase_invoice_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente', 'Coordenador')
    )
  );

-- Admins e Gerentes podem atualizar itens
DROP POLICY IF EXISTS "purchase_invoice_items_update_policy" ON purchase_invoice_items;
CREATE POLICY "purchase_invoice_items_update_policy" ON purchase_invoice_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'Gerente')
    )
  );

-- Itens são deletados em cascata com a nota
DROP POLICY IF EXISTS "purchase_invoice_items_delete_policy" ON purchase_invoice_items;
CREATE POLICY "purchase_invoice_items_delete_policy" ON purchase_invoice_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Comentários
COMMENT ON TABLE purchase_invoices IS 'Notas fiscais de compra (entrada)';
COMMENT ON COLUMN purchase_invoices.id IS 'ID único da nota';
COMMENT ON COLUMN purchase_invoices.supplier_id IS 'ID do fornecedor';
COMMENT ON COLUMN purchase_invoices.numero_nota IS 'Número da nota fiscal';
COMMENT ON COLUMN purchase_invoices.data_nota IS 'Data de emissão da nota';
COMMENT ON COLUMN purchase_invoices.data_vencimento IS 'Data de vencimento para pagamento';
COMMENT ON COLUMN purchase_invoices.valor_total IS 'Valor total da nota';
COMMENT ON COLUMN purchase_invoices.status IS 'Status: Pendente, Pago ou Vencido';
COMMENT ON COLUMN purchase_invoices.data_pagamento IS 'Data em que foi pago';
COMMENT ON COLUMN purchase_invoices.forma_pagamento IS 'Forma de pagamento utilizada';
COMMENT ON COLUMN purchase_invoices.created_by IS 'Usuário que cadastrou a nota';

COMMENT ON TABLE purchase_invoice_items IS 'Itens das notas fiscais de compra';
COMMENT ON COLUMN purchase_invoice_items.invoice_id IS 'ID da nota fiscal';
COMMENT ON COLUMN purchase_invoice_items.produto_id IS 'ID do produto (opcional)';
COMMENT ON COLUMN purchase_invoice_items.descricao IS 'Descrição do item';
COMMENT ON COLUMN purchase_invoice_items.quantidade IS 'Quantidade';
COMMENT ON COLUMN purchase_invoice_items.valor_unitario IS 'Valor unitário';
COMMENT ON COLUMN purchase_invoice_items.valor_total IS 'Valor total do item';
