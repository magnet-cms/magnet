-- Enable pgsodium (required by supabase_vault)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Enable Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Grant vault access to service_role (used by the Magnet backend via PostgREST)
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA vault TO service_role;

-- Automatically enable RLS on admin-only tables when the Magnet backend creates them.
-- These tables are internal and should never be accessible via PostgREST (anon/authenticated).
-- The backend connects directly to PostgreSQL (not via PostgREST), so it is unaffected.
CREATE OR REPLACE FUNCTION _magnet_enable_rls_on_admin_tables()
RETURNS event_trigger LANGUAGE plpgsql AS $$
DECLARE
  obj record;
  admin_tables text[] := ARRAY[
    'webhooks',
    'apikeys',
    'apikeyusages',
    'settings'
  ];
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
      AND schema_name = 'public'
  LOOP
    IF split_part(obj.object_identity, '.', 2) = ANY(admin_tables) THEN
      EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
    END IF;
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER magnet_rls_on_admin_tables
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION _magnet_enable_rls_on_admin_tables();
