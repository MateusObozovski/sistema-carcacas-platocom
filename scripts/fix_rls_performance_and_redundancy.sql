-- Optimizing RLS Policies for Performance and Removing Redundancy
-- Fixes: auth_rls_initplan (wrapping auth calls) and multiple_permissive_policies (consolidation)

-- =====================================================================================
-- 1. PROFILES
-- =====================================================================================

-- DROP redundant/old policies
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do everything" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "admin can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- CREATE optimized policies

-- Combined SELECT: Authenticated users can view logic + Service Role
CREATE POLICY "Authenticated users and service role can view profiles"
ON public.profiles FOR SELECT
USING (
  role = 'service_role' 
  OR 
  (select auth.role()) = 'service_role'
  OR
  (select auth.uid()) IS NOT NULL
);

-- Service Role & Admin INSERT
CREATE POLICY "Service role and admins can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (
  (select auth.role()) = 'service_role'
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role = 'admin'
  )
);

-- UPDATE: Service Role (Everything) + Users (Own Profile) + Admin (Maybe? Leaving strict as per orig)
-- Original 'Service role can do everything' implied generic access.
-- Original 'Users can update their own profile'.
CREATE POLICY "Users can update own profile and service role full access"
ON public.profiles FOR UPDATE
USING (
  (select auth.role()) = 'service_role'
  OR 
  id = (select auth.uid())
);

-- DELETE: Service role usually needs delete, though not flagged, adding for safety if "Service role can do everything" covered it.
-- If no specific delete policy existed for users, we only allow service_role.
CREATE POLICY "Service role can delete profiles"
ON public.profiles FOR DELETE
USING (
  (select auth.role()) = 'service_role'
);


-- =====================================================================================
-- 2. PRODUCTS
-- =====================================================================================

DROP POLICY IF EXISTS "Admins, Gerentes e Coordenadores can manage products" ON public.products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.products;

-- Optimized SELECT (Anyone)
CREATE POLICY "Anyone can view active products"
ON public.products FOR SELECT
USING (
  ativo = true
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- Optimized INSERT/UPDATE/DELETE (Managers)
CREATE POLICY "Managers can manage products"
ON public.products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);


-- =====================================================================================
-- 3. CLIENTS
-- =====================================================================================

DROP POLICY IF EXISTS "Authenticated users can insert clients" ON public.clients;
DROP POLICY IF EXISTS "Vendedores can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Vendedores can view their own clients" ON public.clients;

-- Optimized INSERT
CREATE POLICY "Authenticated users can insert clients"
ON public.clients FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
);

-- Consolidated SELECT (View own + Manager override)
CREATE POLICY "Vendedores and Managers can view clients"
ON public.clients FOR SELECT
USING (
  vendedor_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- Consolidated UPDATE (Update own + Manager override)
CREATE POLICY "Vendedores and Managers can update clients"
ON public.clients FOR UPDATE
USING (
  vendedor_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);


-- =====================================================================================
-- 4. ORDERS
-- =====================================================================================

DROP POLICY IF EXISTS "Authenticated users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Vendedores can update their own orders" ON public.orders;
DROP POLICY IF EXISTS "Vendedores can view their own orders" ON public.orders;

-- INSERT
CREATE POLICY "Authenticated users can insert orders"
ON public.orders FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
);

-- SELECT
CREATE POLICY "Vendedores and Managers can view orders"
ON public.orders FOR SELECT
USING (
  vendedor_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- UPDATE
CREATE POLICY "Vendedores and Managers can update orders"
ON public.orders FOR UPDATE
USING (
  vendedor_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);


-- =====================================================================================
-- 5. ORDER ITEMS
-- =====================================================================================

DROP POLICY IF EXISTS "Users can insert order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items for linking" ON public.order_items;
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;

-- INSERT
CREATE POLICY "Users can insert order items for their orders"
ON public.order_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
    AND vendedor_id = (select auth.uid())
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);

-- SELECT
CREATE POLICY "Users can view order items for their orders"
ON public.order_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
    AND (
      vendedor_id = (select auth.uid())
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  )
);

-- UPDATE
CREATE POLICY "Users and Managers can update order items"
ON public.order_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = order_items.order_id
    AND (
      vendedor_id = (select auth.uid())
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role IN ('admin', 'Gerente', 'Coordenador')
      )
    )
  )
);


-- =====================================================================================
-- 6. CORE RETURNS
-- =====================================================================================

DROP POLICY IF EXISTS "Vendedores can insert returns" ON public.core_returns;
DROP POLICY IF EXISTS "Vendedores can view their own returns" ON public.core_returns;

-- INSERT
CREATE POLICY "Vendedores can insert returns"
ON public.core_returns FOR INSERT
WITH CHECK (
  (select auth.uid()) IS NOT NULL
);

-- SELECT
CREATE POLICY "Vendedores and Managers can view returns"
ON public.core_returns FOR SELECT
USING (
  vendedor_id = (select auth.uid())
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador')
  )
);


-- =====================================================================================
-- 7. MERCHANDISE ENTRIES
-- =====================================================================================

DROP POLICY IF EXISTS "Authenticated users can create entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Users can view entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Managers can update entry status" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Users can update their own pending entries" ON public.merchandise_entries;
-- Dropping potential old names from other scripts just in case
DROP POLICY IF EXISTS "Operadores can view their own entries" ON public.merchandise_entries;
DROP POLICY IF EXISTS "Operadores can create entries" ON public.merchandise_entries;

-- INSERT
CREATE POLICY "Authenticated users can create entries"
ON public.merchandise_entries FOR INSERT
WITH CHECK (
  created_by = (select auth.uid())
  AND (select auth.uid()) IS NOT NULL
);

-- SELECT
CREATE POLICY "Users view own entries and Managers view all"
ON public.merchandise_entries FOR SELECT
USING (
  created_by = (select auth.uid())
  OR 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
  )
);

-- UPDATE (Consolidated)
CREATE POLICY "Users update own pending OR Managers update status"
ON public.merchandise_entries FOR UPDATE
USING (
  (
    created_by = (select auth.uid())
    AND status = 'Pendente'
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = (select auth.uid())
    AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
  )
);


-- =====================================================================================
-- 8. MERCHANDISE ENTRY ITEMS
-- =====================================================================================

DROP POLICY IF EXISTS "Authenticated users can create entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Users can view entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Authenticated users can update entry items" ON public.merchandise_entry_items;
DROP POLICY IF EXISTS "Managers can update entry item links" ON public.merchandise_entry_items;

-- INSERT
CREATE POLICY "Users can create items for own pending entries"
ON public.merchandise_entry_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.merchandise_entries
    WHERE id = entry_id
    AND created_by = (select auth.uid())
    AND status = 'Pendente'
  )
);

-- SELECT
CREATE POLICY "Users view items of visible entries"
ON public.merchandise_entry_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.merchandise_entries
    WHERE id = entry_id
    AND (
      created_by = (select auth.uid())
      OR
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = (select auth.uid())
        AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
      )
    )
  )
);

-- UPDATE (Consolidated)
CREATE POLICY "Users update own items OR Managers update links"
ON public.merchandise_entry_items FOR UPDATE
USING (
  (
    EXISTS (
      SELECT 1 FROM public.merchandise_entries
      WHERE id = entry_id
      AND created_by = (select auth.uid())
      AND status = 'Pendente'
    )
  )
  OR
  (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (select auth.uid())
      AND role IN ('admin', 'Gerente', 'Coordenador', 'Vendedor')
    )
  )
);
