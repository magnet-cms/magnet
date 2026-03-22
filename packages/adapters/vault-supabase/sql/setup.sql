-- Magnet CMS — Supabase Vault Adapter Setup
--
-- Run this in your Supabase SQL Editor (or as a migration) before using the
-- SupabaseVaultAdapter. These functions wrap vault.* operations in the public
-- schema so that PostgREST does NOT need to expose the vault schema directly.
--
-- All functions use SECURITY DEFINER so they run with the owner's privileges
-- (which have vault access) regardless of the caller's role.
-- Access is restricted to service_role only.

-- ============================================================================
-- Health check
-- ============================================================================

CREATE OR REPLACE FUNCTION public.magnet_vault_health()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  PERFORM name FROM vault.decrypted_secrets LIMIT 1;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$;

-- ============================================================================
-- List secrets (metadata only — no decrypted values)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.magnet_vault_list(p_prefix text DEFAULT NULL)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
BEGIN
  IF p_prefix IS NOT NULL THEN
    RETURN (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT name, description, updated_at
        FROM vault.secrets
        WHERE name LIKE p_prefix || '%'
        ORDER BY name
      ) s
    );
  ELSE
    RETURN (
      SELECT COALESCE(json_agg(row_to_json(s)), '[]'::json)
      FROM (
        SELECT name, description, updated_at
        FROM vault.secrets
        ORDER BY name
      ) s
    );
  END IF;
END;
$$;

-- ============================================================================
-- Get a single decrypted secret by name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.magnet_vault_get(p_name text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  result text;
BEGIN
  SELECT decrypted_secret INTO result
  FROM vault.decrypted_secrets
  WHERE name = p_name;
  RETURN result;
END;
$$;

-- ============================================================================
-- Create or update a secret (upsert by name)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.magnet_vault_set(
  p_name        text,
  p_secret      text,
  p_description text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = p_name;

  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, p_secret, p_name, p_description);
  ELSE
    PERFORM vault.create_secret(p_secret, p_name, p_description);
  END IF;
END;
$$;

-- ============================================================================
-- Delete a secret by name
-- ============================================================================

CREATE OR REPLACE FUNCTION public.magnet_vault_delete(p_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = vault, public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id
  FROM vault.decrypted_secrets
  WHERE name = p_name;

  IF existing_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = existing_id;
  END IF;
END;
$$;

-- ============================================================================
-- Restrict access: service_role only
-- ============================================================================

REVOKE ALL ON FUNCTION public.magnet_vault_health() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.magnet_vault_list(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.magnet_vault_get(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.magnet_vault_set(text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.magnet_vault_delete(text) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.magnet_vault_health() TO service_role;
GRANT EXECUTE ON FUNCTION public.magnet_vault_list(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.magnet_vault_get(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.magnet_vault_set(text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.magnet_vault_delete(text) TO service_role;
