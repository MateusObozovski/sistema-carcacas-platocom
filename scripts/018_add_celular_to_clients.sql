-- Adicionar campo celular à tabela clients
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS celular text;

