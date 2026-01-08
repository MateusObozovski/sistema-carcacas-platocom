# Configuração de Anexos de Entrada via SQL

Para habilitar a funcionalidade de anexos nas Entradas de Mercadoria, execute o script abaixo no **SQL Editor** do Supabase Dashboard.

## Passo 1: Criar Tabela de Documentos

```sql
-- Criar tabela de documentos
CREATE TABLE IF NOT EXISTS public.merchandise_entry_items_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entry_id UUID NOT NULL REFERENCES public.merchandise_entries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT,
    size BIGINT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.merchandise_entry_items_documents ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso (RLS)
-- Permitir leitura para usuários autenticados
CREATE POLICY "Leitura permitida para usuários autenticados"
ON public.merchandise_entry_items_documents
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserção para usuários autenticados
CREATE POLICY "Inserção permitida para usuários autenticados"
ON public.merchandise_entry_items_documents
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Permitir exclusão se o usuário criar a entrada ou for admin (simplificado para users autenticados por enquanto)
CREATE POLICY "Exclusão permitida para usuários autenticados"
ON public.merchandise_entry_items_documents
FOR DELETE
TO authenticated
USING (true);
```

## Passo 2: Configurar Storage

1. Vá em **Storage** no menu lateral.
2. Crie um novo Bucket chamado `documents`.
   - Public: **Sim** (para facilitar download/visualização, ou Não se quiser usar URLs assinadas. Vamos assumir Public por enquanto para simplificar a visualização no frontend, ou urls assinadas no backend. O código usará `getPublicUrl` ou `createSignedUrl`. Vamos criar como **Public** para facilitar).
3. configure as políticas do Storage (ou execute o SQL abaixo se o Supabase permitir criar policies de storage via SQL, geralmente permite):

```sql
-- Inserir bucket se não existir (apenas via API ou Dashboard, SQL direto em storage.buckets nem sempre é permitido/seguro).
-- Mas podemos configurar as POLICIES de objects.

-- Política de Select (Download/View)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
TO authenticated
USING ( bucket_id = 'documents' );

-- Política de Insert (Upload)
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'documents' );

-- Política de Delete
CREATE POLICY "Authenticated Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'documents' );
```

> **Nota**: Se você não conseguir criar o bucket via SQL, crie manualmente no Dashboard com o nome `documents` e certifique-se de que é **Público**.
