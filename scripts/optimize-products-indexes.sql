-- Script SQL para Otimização de Performance - Tabela Products
-- Execute este script no Supabase SQL Editor para criar índices que melhoram a performance

-- Índice para filtro por status ativo
CREATE INDEX IF NOT EXISTS idx_products_ativo 
ON products(ativo);

-- Índice para filtro por marca
CREATE INDEX IF NOT EXISTS idx_products_marca 
ON products(marca);

-- Índice para filtro por tipo
CREATE INDEX IF NOT EXISTS idx_products_tipo 
ON products(tipo);

-- Índice para filtro por categoria
CREATE INDEX IF NOT EXISTS idx_products_categoria 
ON products(categoria);

-- Índice para busca por nome (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_products_nome_lower 
ON products(LOWER(nome));

-- Índice para busca por código
CREATE INDEX IF NOT EXISTS idx_products_codigo_lower 
ON products(LOWER(codigo));

-- Índice para busca por código do fabricante
CREATE INDEX IF NOT EXISTS idx_products_codigo_fabricante_lower 
ON products(LOWER(codigo_fabricante));

-- Índice composto para queries comuns (ativo + nome)
CREATE INDEX IF NOT EXISTS idx_products_ativo_nome 
ON products(ativo, nome);

-- Índice para order_items.produto_id (melhora verificação de uso)
CREATE INDEX IF NOT EXISTS idx_order_items_produto_id 
ON order_items(produto_id);

-- Verificar índices criados
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename IN ('products', 'order_items')
ORDER BY tablename, indexname;
