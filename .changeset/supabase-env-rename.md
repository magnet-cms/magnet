---
"@magnet-cms/adapter-auth-supabase": major
"@magnet-cms/adapter-storage-supabase": major
"@magnet-cms/adapter-vault-supabase": major
"create-magnet": major
---

BREAKING: Renamed Supabase environment variables to match Supabase's current API key naming.

- `SUPABASE_ANON_KEY` → `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_KEY` → `SUPABASE_SECRET_KEY`

**Migration:** Update your `.env` file to use the new variable names. You can find these values in your Supabase project dashboard at **Settings → API → API Keys**.
