-- Fix RLS blocking the client_users insertion
-- This script adds permission for service_role to insert into client_users

-- Add policy to allow service_role to manage client_users
DROP POLICY IF EXISTS "Service role can manage client_users" ON client_users;

CREATE POLICY "Service role can manage client_users"
  ON client_users
  FOR ALL
  USING (
    -- Allow service_role (used by API with SUPABASE_SERVICE_ROLE_KEY)
    auth.role() = 'service_role'
  );

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON client_users TO service_role;

-- Verify the fix
DO $$
BEGIN
  RAISE NOTICE 'Client users RLS fix applied successfully!';
  RAISE NOTICE 'The service_role can now insert into client_users table.';
END $$;
