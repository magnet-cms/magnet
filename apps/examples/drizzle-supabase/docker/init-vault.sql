-- Enable pgsodium (required by supabase_vault)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Enable Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Grant vault access to service_role (used by the Magnet backend via PostgREST)
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA vault TO service_role;

-- Automatically enable RLS on ALL tables in the public schema when created.
-- Magnet manages all data through its own API (direct PostgreSQL connection as superuser),
-- so PostgREST access (anon/authenticated roles) should be blocked on every table.
-- RLS without policies = no PostgREST access. The backend bypasses RLS as superuser.
CREATE OR REPLACE FUNCTION _magnet_enable_rls()
RETURNS event_trigger LANGUAGE plpgsql
SET search_path = '' AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN
    SELECT * FROM pg_event_trigger_ddl_commands()
    WHERE command_tag = 'CREATE TABLE'
      AND schema_name = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', obj.object_identity);
  END LOOP;
END;
$$;

CREATE EVENT TRIGGER magnet_enable_rls
  ON ddl_command_end
  WHEN TAG IN ('CREATE TABLE')
  EXECUTE FUNCTION _magnet_enable_rls();
