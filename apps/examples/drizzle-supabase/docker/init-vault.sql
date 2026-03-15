-- Enable pgsodium (required by supabase_vault)
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Enable Supabase Vault extension
CREATE EXTENSION IF NOT EXISTS supabase_vault;

-- Grant vault access to service_role (used by the Magnet backend via PostgREST)
GRANT USAGE ON SCHEMA vault TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA vault TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA vault TO service_role;
