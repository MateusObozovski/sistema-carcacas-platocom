-- Final RLS Fixes
-- Fixes: auth_rls_initplan (Documents) and multiple_permissive_policies (Products)

-- =====================================================================================
-- 1. OPTIMIZE DOCUMENTS RLS (Performance)
-- =====================================================================================

-- Drop previous policies (whether they were the "security" ones or older ones)
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.merchandise_entry_items_documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.merchandise_entry_items_documents;
DROP POLICY IF EXISTS "Exclusão permitida para usuários autenticados" ON public.merchandise_entry_items_documents;
DROP POLICY IF EXISTS "Inserção permitida para usuários autenticados" ON public.merchandise_entry_items_documents;

-- Create Performance Optimized Policies (using select wrapper)
CREATE POLICY "Authenticated users can insert documents"
ON public.merchandise_entry_items_documents FOR INSERT
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
);

CREATE POLICY "Authenticated users can delete documents"
ON public.merchandise_entry_items_documents FOR DELETE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
);


-- =====================================================================================
-- 2. FIX PRODUCTS POLICY OVERLAP (Redundancy)
-- =====================================================================================

-- The issue: "Managers can manage products" was FOR ALL, overlapping with specific SELECT policies.
-- We will split it into specific write policies.

DROP POLICY IF EXISTS "Managers can manage products" ON public.products;
DROP POLICY IF EXISTS "Admins, Gerentes e Coordenadores can manage products" ON public.products; -- ensuring cleanup

-- INSERT (Managers only)
CREATE POLICY "Managers can insert products"
ON public.products FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- UPDATE (Managers only)
CREATE POLICY "Managers can update products"
ON public.products FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- DELETE (Managers only)
CREATE POLICY "Managers can delete products"
ON public.products FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- Note: We do NOT create a SELECT policy here because "Anyone can view active products" 
-- (from the first script) already covers managers via its OR clause.
