import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'

interface SignUpPayload {
  full_name: string
  email: string
  password: string
  phone?: string
  primary_skill?: string
}

interface AuthContextValue {
  user: User | null
  profile: Profile | null
  /** true while the initial session is being resolved */
  loading: boolean
  isAdmin: boolean
  signIn: (email: string, password: string) => Promise<{ mfaRequired: boolean }>
  signUp: (payload: SignUpPayload) => Promise<{ needsEmailConfirm: boolean }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
  if (error) {
    // Profile row may lag a moment behind signup (created by DB trigger) — one retry.
    await new Promise((r) => setTimeout(r, 600))
    const retry = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
    if (retry.error) return null
    return (retry.data as Profile) ?? null
  }
  return (data as Profile) ?? null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null)
      return
    }
    const p = await fetchProfile(u.id)
    setProfile(p)
  }, [])

  useEffect(() => {
    let mounted = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return
        const u = data.session?.user ?? null
        setUser(u)
        await loadProfile(u)
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setLoading(false)
      })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      // Defer profile fetch to avoid Supabase auth re-entrancy warnings
      void Promise.resolve().then(() => loadProfile(u))
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
    // If the account has a verified TOTP factor, the session is only AAL1 until
    // the second factor is verified — the caller then shows the code step.
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return { mfaRequired: aal?.nextLevel === 'aal2' && aal?.currentLevel !== aal?.nextLevel }
  }, [])

  const signUp = useCallback(async (payload: SignUpPayload) => {
    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        data: {
          full_name: payload.full_name.trim(),
          phone: payload.phone?.trim() || null,
          primary_skill: payload.primary_skill?.trim() || null,
        },
      },
    })
    if (error) throw error
    return { needsEmailConfirm: !data.session }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) setProfile(await fetchProfile(user.id))
  }, [user])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, signIn, signUp, signOut, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
