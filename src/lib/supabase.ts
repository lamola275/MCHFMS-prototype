import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Supabase connection bootstrap.
 *
 * Connection settings are resolved in this order:
 *  1. Build-time environment variables (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 *     — the normal path when running locally with a `.env` file (see .env.example).
 *  2. The in-app setup screen, which stores ONLY the project URL and anon key in
 *     this browser's localStorage so the hosted preview can be connected without a
 *     rebuild. The anon key is safe to expose: all data is protected by Row Level
 *     Security policies on the Supabase side. No application data is ever stored
 *     in the browser — everything lives in the Supabase Postgres database.
 */

const LS_URL = 'mchfms.supabase.url'
const LS_KEY = 'mchfms.supabase.anonKey'

export interface SupabaseConfig {
  url: string
  anonKey: string
  /** true when the config came from build-time env vars */
  fromEnv: boolean
}

export function getSupabaseConfig(): SupabaseConfig {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? ''
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? ''
  if (envUrl && envKey) return { url: envUrl, anonKey: envKey, fromEnv: true }
  return {
    url: localStorage.getItem(LS_URL) ?? '',
    anonKey: localStorage.getItem(LS_KEY) ?? '',
    fromEnv: false,
  }
}

export function saveSupabaseConfig(url: string, anonKey: string): void {
  localStorage.setItem(LS_URL, url.trim())
  localStorage.setItem(LS_KEY, anonKey.trim())
}

export function clearSupabaseConfig(): void {
  localStorage.removeItem(LS_URL)
  localStorage.removeItem(LS_KEY)
}

const config = getSupabaseConfig()
export const isSupabaseConfigured = Boolean(config.url && config.anonKey)

// When unconfigured we still create an inert client so imports never crash;
// the app gates all data UI behind `isSupabaseConfigured` (SetupScreen).
export const supabase: SupabaseClient = createClient(
  config.url || 'https://not-configured.supabase.co',
  config.anonKey || 'not-configured',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
