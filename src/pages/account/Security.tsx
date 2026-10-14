import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ShieldCheck, ShieldAlert, KeyRound, Trash2, Smartphone } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { changePasswordSchema, totpSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { Field } from '@/components/Field'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoading } from '@/components/states'

interface FactorInfo {
  id: string
  friendly_name?: string
  status: string
}

export default function Security() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const setupRequired = searchParams.get('setup') === '2fa'

  // ── 2FA state ──────────────────────────────────────────
  const [loadingFactors, setLoadingFactors] = useState(true)
  const [verifiedFactors, setVerifiedFactors] = useState<FactorInfo[]>([])
  const [pendingFactor, setPendingFactor] = useState<FactorInfo | null>(null)
  const [enrolling, setEnrolling] = useState<{ factorId: string; uri: string; secret: string } | null>(null)
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState('')
  const [busy, setBusy] = useState(false)

  const loadFactors = useCallback(async () => {
    setLoadingFactors(true)
    try {
      const { data, error } = await supabase.auth.mfa.listFactors()
      if (error) throw error
      const verified = (data.totp ?? []) as FactorInfo[]
      const all = (data.all ?? []) as FactorInfo[]
      setVerifiedFactors(verified)
      setPendingFactor(all.find((f) => f.status === 'unverified') ?? null)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not load your security settings.'))
    } finally {
      setLoadingFactors(false)
    }
  }, [])

  useEffect(() => {
    void loadFactors()
  }, [loadFactors])

  const startEnroll = async () => {
    setBusy(true)
    setCodeError('')
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'Authenticator app',
      })
      if (error) throw error
      setEnrolling({ factorId: data.id, uri: data.totp.uri, secret: data.totp.secret })
      setCode('')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not start two-factor setup.'))
    } finally {
      setBusy(false)
    }
  }

  const verifyEnroll = async (factorId: string) => {
    setCodeError('')
    const parsed = totpSchema.safeParse({ code })
    if (!parsed.success) {
      setCodeError(fieldErrors(parsed.error).code ?? 'Enter the 6-digit code')
      return
    }
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: parsed.data.code })
      if (error) throw error
      toast.success('Two-factor authentication is now active on your account.')
      setEnrolling(null)
      setCode('')
      await loadFactors()
    } catch (err) {
      setCodeError(friendlyError(err, 'That code did not work. Check the time on your phone and try again.'))
    } finally {
      setBusy(false)
    }
  }

  const removeFactor = async (factorId: string, label: string) => {
    setBusy(true)
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId })
      if (error) throw error
      toast.success(`${label} removed.`)
      setEnrolling(null)
      setCode('')
      await loadFactors()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not remove the authenticator.'))
    } finally {
      setBusy(false)
    }
  }

  // ── Password change ────────────────────────────────────
  const [pw, setPw] = useState({ password: '', confirm: '' })
  const [pwErrors, setPwErrors] = useState<Record<string, string>>({})
  const [pwBusy, setPwBusy] = useState(false)

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwErrors({})
    const parsed = changePasswordSchema.safeParse(pw)
    if (!parsed.success) {
      setPwErrors(fieldErrors(parsed.error))
      return
    }
    setPwBusy(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: parsed.data.password })
      if (error) throw error
      setPw({ password: '', confirm: '' })
      toast.success('Your password has been changed.')
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change your password. Try signing out and back in first.'))
    } finally {
      setPwBusy(false)
    }
  }

  if (!user) return null
  if (loadingFactors) return <PageLoading label="Loading security settings…" />

  const has2fa = verifiedFactors.length > 0

  return (
    <div className="space-y-8">
      {setupRequired && !has2fa && (
        <div className="flex items-start gap-3 rounded-[1.2rem] border-[1.5px] border-clay bg-clay/10 p-5" role="alert">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-clay" />
          <div>
            <p className="font-semibold text-clay">Administrators must enable two-factor authentication</p>
            <p className="mt-1 text-sm leading-relaxed text-ink/70">
              The admin dashboard controls community data, so coordinator accounts are required to set up an
              authenticator app before continuing. It takes less than a minute below.
            </p>
          </div>
        </div>
      )}

      {/* ── Two-factor authentication ─────────────────────── */}
      <section className="frame p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
              <Smartphone className="h-5 w-5 text-clay" /> Two-factor authentication (2FA)
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink/60">
              After your password, a 6-digit code from an authenticator app (Google Authenticator, Microsoft
              Authenticator, 1Password…) is required to sign in.
            </p>
          </div>
          {has2fa ? (
            <span className="pill pill-static border-forest !text-forest">
              <ShieldCheck className="h-3.5 w-3.5" /> Enabled
            </span>
          ) : (
            <span className="pill pill-static border-clay !text-clay">
              <ShieldAlert className="h-3.5 w-3.5" /> Not enabled
            </span>
          )}
        </div>

        {/* Active factors */}
        {verifiedFactors.map((f) => (
          <div key={f.id} className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-[1.5px] border-ink/30 bg-forest/5 px-4 py-3">
            <p className="text-sm font-medium">
              {f.friendly_name ?? 'Authenticator app'}
              <span className="ml-2 text-xs font-normal text-ink/50">verified</span>
            </p>
            <ConfirmDialog
              trigger={
                <button className="btn-ghost-ink !px-4 !py-1.5 !text-xs" disabled={busy}>
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              }
              title="Remove two-factor authentication?"
              description="Your account will only be protected by your password. Administrators will lose access to the dashboard until 2FA is set up again."
              confirmLabel="Remove 2FA"
              destructive
              onConfirm={() => removeFactor(f.id, 'Authenticator')}
            />
          </div>
        ))}

        {/* Incomplete enrollment found */}
        {pendingFactor && !enrolling && !has2fa && (
          <div className="mt-5 rounded-xl border-[1.5px] border-mustard bg-mustard/15 px-4 py-3 text-sm">
            <p className="font-semibold">An unfinished 2FA setup was found.</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button className="btn-ink !px-4 !py-1.5 !text-xs" disabled={busy} onClick={() => setEnrolling({ factorId: pendingFactor.id, uri: '', secret: '' })}>
                Finish setup with a code
              </button>
              <button className="btn-ghost-ink !px-4 !py-1.5 !text-xs" disabled={busy} onClick={() => void removeFactor(pendingFactor.id, 'Unfinished setup')}>
                Discard & start over
              </button>
            </div>
          </div>
        )}

        {/* Enrollment flow */}
        {enrolling ? (
          <div className="mt-6 grid gap-6 rounded-xl border-[1.5px] border-ink bg-tan/40 p-5 sm:grid-cols-[auto_1fr]">
            {enrolling.uri ? (
              <div className="mx-auto rounded-xl border-[1.5px] border-ink bg-white p-3">
                <QRCodeSVG value={enrolling.uri} size={168} />
              </div>
            ) : (
              <div className="mx-auto flex h-[192px] w-[192px] items-center justify-center rounded-xl border-[1.5px] border-dashed border-ink/40 bg-white p-3 text-center text-xs text-ink/50">
                QR unavailable for this session — continue with the code you already saved
              </div>
            )}
            <div>
              <p className="font-semibold">1 · Scan with your authenticator app</p>
              <p className="mt-1 text-sm text-ink/60">
                Can't scan? Enter this setup key manually:
              </p>
              {enrolling.secret && (
                <code className="mt-2 inline-block rounded-lg border border-ink/30 bg-white px-3 py-1.5 font-mono text-sm tracking-wider">
                  {enrolling.secret}
                </code>
              )}
              <p className="mt-4 font-semibold">2 · Enter the 6-digit code it shows</p>
              <div className="mt-2 max-w-[240px]">
                <Field id="mfa-code" label="Verification code" error={codeError} required>
                  <input
                    id="mfa-code"
                    inputMode="numeric"
                    maxLength={6}
                    className="field-input text-center font-mono !text-xl tracking-[0.4em]"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    autoComplete="one-time-code"
                  />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button className="btn-clay !px-4 !py-2 !text-xs" disabled={busy || code.length !== 6} onClick={() => void verifyEnroll(enrolling.factorId)}>
                  {busy ? 'Verifying…' : 'Activate 2FA'}
                </button>
                <button className="btn-ghost-ink !px-4 !py-2 !text-xs" disabled={busy} onClick={() => void removeFactor(enrolling.factorId, 'Setup cancelled')}>
                  Cancel setup
                </button>
              </div>
            </div>
          </div>
        ) : (
          !pendingFactor && !has2fa && (
            <button className="btn-clay mt-6" disabled={busy} onClick={() => void startEnroll()}>
              <ShieldCheck className="h-4 w-4" /> {busy ? 'Preparing…' : 'Set up two-factor authentication'}
            </button>
          )
        )}
      </section>

      {/* ── Change password ───────────────────────────────── */}
      <section className="frame p-6 sm:p-8">
        <h2 className="flex items-center gap-2 font-display text-2xl font-semibold">
          <KeyRound className="h-5 w-5 text-clay" /> Change password
        </h2>
        <form onSubmit={(e) => void submitPassword(e)} className="mt-5 grid max-w-md gap-5" noValidate>
          <Field id="new-pw" label="New password" error={pwErrors.password} hint="At least 8 characters, with a letter and a number." required>
            <input
              id="new-pw"
              type="password"
              className="field-input"
              value={pw.password}
              onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
              autoComplete="new-password"
            />
          </Field>
          <Field id="confirm-pw" label="Confirm new password" error={pwErrors.confirm} required>
            <input
              id="confirm-pw"
              type="password"
              className="field-input"
              value={pw.confirm}
              onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              autoComplete="new-password"
            />
          </Field>
          <div>
            <button type="submit" className="btn-ink" disabled={pwBusy}>
              {pwBusy ? 'Updating…' : 'Update password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
