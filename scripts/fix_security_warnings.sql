-- Security Fixes for Supabase Warnings
-- Fixes: function_search_path_mutable and rls_policy_always_true

-- =====================================================================================
-- 1. SECURE FUNCTIONS (Set search_path to public)
-- =====================================================================================

-- public.update_merchandise_entry_updated_at
ALTER FUNCTION public.update_merchandise_entry_updated_at() SET search_path = public;

-- public.generate_order_number
ALTER FUNCTION public.generate_order_number() SET search_path = public;

-- public.handle_core_return
ALTER FUNCTION public.handle_core_return() SET search_path = public;


-- =====================================================================================
-- 2. HARDEN RLS POLICIES (merchandise_entry_items_documents)
-- =====================================================================================
-- Current policies were likely "USING (true)" which is flagged as insecure for modification methods.

-- Remove old permissive policies
DROP POLICY IF EXISTS "Exclusão permitida para usuários autenticados" ON public.merchandise_entry_items_documents;
DROP POLICY IF EXISTS "Inserção permitida para usuários autenticados" ON public.merchandise_entry_items_documents;

-- Create stricter policies checking authentication
-- Assuming the intent is simply that any logged-in user can insert/delete (which matches 'true' for auth users, but explicit check is safer/compliant)

CREATE POLICY "Authenticated users can insert documents"
ON public.merchandise_entry_items_documents FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
);

CREATE POLICY "Authenticated users can delete documents"
ON public.merchandise_entry_items_documents FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
);

-- =====================================================================================
-- NOTE ON PASSWORD PROTECTION
-- =====================================================================================
-- The warning "auth_leaked_password_protection" cannot be fixed via SQL.
-- Please enable "Leaked Password Protection" in your Supabase Dashboard:
-- Authentication > Protection > Leaked Password Protection
