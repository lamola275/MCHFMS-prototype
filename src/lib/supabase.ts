import { createClient } from '@supabase/supabase-js'

/**
 * Supabase connection.
 *
 * The app reads its project credentials from build-time environment variables:
 *   VITE_SUPABASE_URL      — your project URL (https://<ref>.supabase.co)
 *   VITE_SUPABASE_ANON_KEY — the anon public key
 *
 * Set them in a `.env` file (copy `.env.example`) for local development, or in
 * your host's environment settings when deploying. See SUPABASE-SETUP-GUIDE.md
 * for the full walkthrough.
 *
 * The anon key is safe to ship in the browser: every table is protected by Row
 * Level Security policies on the Supabase side, not by secrecy of this key.
 */

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''

export const isSupabaseConfigured = Boolean(url && anonKey)

// When unconfigured we still create an inert client so imports never crash;
// data sections then show a friendly "not configured" notice instead.
export const supabase = createClient(
  url || 'https://not-configured.supabase.co',
  anonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
