import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { PageLoading } from '@/components/states'

export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <PageLoading label="Checking your session…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  return <Outlet />
}

export function RequireAdmin() {
  const { user, profile, loading, isAdmin } = useAuth()
  const location = useLocation()
  const [mfaChecked, setMfaChecked] = useState(false)
  const [needsMfa, setNeedsMfa] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!isAdmin) {
        setMfaChecked(true)
        return
      }
      // Administrators are required to protect their account with TOTP 2FA.
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (!cancelled) {
        const verified = !error && (data?.totp ?? []).length > 0
        setNeedsMfa(!verified)
        setMfaChecked(true)
      }
    }
    if (!loading && user) void check()
    return () => {
      cancelled = true
    }
  }, [loading, user, isAdmin])

  if (loading || (!mfaChecked && isAdmin)) return <PageLoading label="Checking permissions…" />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />

  if (!profile || !isAdmin) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-clay bg-clay/10 text-clay">
          <ShieldAlert className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold">Coordinators only</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-ink/60">
          This area is restricted to Foundation coordinators. If you believe you should have access, please contact an
          administrator.
        </p>
        <Link to="/" className="btn-ghost-ink mt-8">Back to the homepage</Link>
      </div>
    )
  }

  if (needsMfa) return <Navigate to="/account/security?setup=2fa" replace />

  return <Outlet />
}
