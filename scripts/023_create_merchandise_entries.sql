-- Criar tabelas para Entrada de Mercadoria
-- Este script cria as tabelas merchandise_entries e merchandise_entry_items

-- Tabela principal de entradas de mercadoria
CREATE TABLE IF NOT EXISTS public.merchandise_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  numero_nota_fiscal text NOT NULL,
  data_nota timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída')),
  created_by uuid REFERENCES public.profiles(id) NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela de itens da entrada de mercadoria
CREATE TABLE IF NOT EXISTS public.merchandise_entry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid REFERENCES public.merchandise_entries(id) ON DELETE CASCADE NOT NULL,
  produto_id uuid REFERENCES public.products(id) NOT NULL,
  produto_nome text NOT NULL,
  quantidade integer NOT NULL DEFAULT 1 CHECK (quantidade > 0),
  preco_unitario numeric(10, 2) NOT NULL,
  vinculado boolean DEFAULT false,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.merchandise_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchandise_entry_items ENABLE ROW LEVEL SECURITY;

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_merchandise_entries_cliente ON public.merchandise_entries(cliente_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_entries_status ON public.merchandise_entries(status);
CREATE INDEX IF NOT EXISTS idx_merchandise_entries_created_by ON public.merchandise_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_merchandise_entry_items_entry ON public.merchandise_entry_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_entry_items_produto ON public.merchandise_entry_items(produto_id);
CREATE INDEX IF NOT EXISTS idx_merchandise_entry_items_vinculado ON public.merchandise_entry_items(vinculado);

-- RLS Policies para merchandise_entries

-- Remover policies existentes se houver
DROP POLICY IF EXISTS "Operadores can view their own entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Authenticated users can create entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Operadores can create entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Users can update their own pending entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Operadores can update their own pending entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Managers can update entry status" ON public.merchandise_entries;

-- Operadores podem ver apenas suas próprias entradas, outros veem todas
CREATE POLICY "Operadores can view their own entries"
  ON public.merchandise_entries FOR SELECT
  USING (
    created_by = auth.uid() 
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
  );

-- Todos os usuários autenticados podem criar entradas
CREATE POLICY "Authenticated users can create entries"
  ON public.merchandise_entries FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
    AND auth.uid() IS NOT NULL
  );

-- Todos os usuários autenticados podem atualizar suas próprias entradas (apenas se ainda estiverem pendentes)
CREATE POLICY "Users can update their own pending entries"
  ON public.merchandise_entries FOR UPDATE
  USING (
    created_by = auth.uid()
    AND status = 'Pendente'
    AND auth.uid() IS NOT NULL
  );

-- Admin, Gerente, Coordenador e Vendedor podem atualizar status para Concluída
CREATE POLICY "Managers can update entry status"
  ON public.merchandise_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
  );

-- RLS Policies para merchandise_entry_items

-- Remover policies existentes se houver
DROP POLICY IF EXISTS "Users can view entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Authenticated users can create entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Operadores can create entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Authenticated users can update entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Operadores can update entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Managers can update entry item links" ON public.merchandise_entry_items;

-- Usuários podem ver itens de entradas que eles podem ver
CREATE POLICY "Users can view entry items"
  ON public.merchandise_entry_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.merchandise_entries
      WHERE id = entry_id
      AND (
        created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
        )
      )
    )
  );

-- Todos os usuários autenticados podem criar itens para suas próprias entradas pendentes
CREATE POLICY "Authenticated users can create entry items"
  ON public.merchandise_entry_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.merchandise_entries
      WHERE id = entry_id
      AND created_by = auth.uid()
      AND status = 'Pendente'
    )
    AND auth.uid() IS NOT NULL
  );

-- Todos os usuários autenticados podem atualizar itens de suas entradas pendentes
CREATE POLICY "Authenticated users can update entry items"
  ON public.merchandise_entry_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.merchandise_entries
      WHERE id = entry_id
      AND created_by = auth.uid()
      AND status = 'Pendente'
    )
    AND auth.uid() IS NOT NULL
  );

-- Admin, Gerente, Coordenador e Vendedor podem atualizar vínculos
CREATE POLICY "Managers can update entry item links"
  ON public.merchandise_entry_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
  );

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_merchandise_entry_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_merchandise_entries_updated_at ON public.merchandise_entries;

CREATE TRIGGER update_merchandise_entries_updated_at
  BEFORE UPDATE ON public.merchandise_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_merchandise_entry_updated_at();

