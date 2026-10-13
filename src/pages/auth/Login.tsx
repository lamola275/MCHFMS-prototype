import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { LogIn, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase'
import { loginSchema, totpSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { Field } from '@/components/Field'
import { BrandMark } from '@/components/Brand'

type Step = 'credentials' | 'mfa'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  const [step, setStep] = useState<Step>('credentials')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [factorId, setFactorId] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setErrors({})

    const parsed = loginSchema.safeParse({ email, password })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { mfaRequired } = await signIn(parsed.data.email, parsed.data.password)
      if (mfaRequired) {
        // Find the verified TOTP factor to challenge against
        const { data: factors, error: fErr } = await supabase.auth.mfa.listFactors()
        if (fErr) throw fErr
        const totpFactor = factors.totp[0]
        if (!totpFactor) throw new Error('Two-factor setup is incomplete. Please contact an administrator.')
        setFactorId(totpFactor.id)
        setStep('mfa')
        toast.message('Almost there', { description: 'Enter the 6-digit code from your authenticator app.' })
      } else {
        toast.success('Welcome back!')
        navigate(from, { replace: true })
      }
    } catch (err) {
      setFormError(friendlyError(err, 'We could not sign you in. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  const submitMfa = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setErrors({})

    const parsed = totpSchema.safeParse({ code })
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { error: vErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: parsed.data.code,
      })
      if (vErr) throw vErr
      toast.success('Welcome back — two-factor verified.')
      navigate(from, { replace: true })
    } catch (err) {
      setFormError(friendlyError(err, 'That code did not work. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 sm:py-20">
      <BrandMark className="h-12 w-12 text-clay" />

      {step === 'credentials' ? (
        <>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-2 text-center text-sm text-ink/60">
            Sign in to register for events and manage your volunteer profile.
          </p>

          <form onSubmit={(e) => void submitCredentials(e)} className="frame mt-8 w-full space-y-5 p-6 sm:p-8" noValidate>
            <Field id="email" label="Email address" error={errors.email} required>
              <input
                id="email"
                type="email"
                className="field-input"
                placeholder="you@example.co.za"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            <Field id="password" label="Password" error={errors.password} required>
              <input
                id="password"
                type="password"
                className="field-input"
                placeholder="Your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </Field>

            {formError && (
              <p className="field-error !text-sm" role="alert">{formError}</p>
            )}

            <button type="submit" className="btn-clay w-full" disabled={busy}>
              <LogIn className="h-4 w-4" /> {busy ? 'Signing in…' : 'Sign in'}
            </button>

            <div className="flex items-center justify-between text-xs">
              <Link to="/forgot-password" className="link-dotted font-semibold">Forgot your password?</Link>
              <Link to="/register" className="link-dotted font-semibold">Create an account</Link>
            </div>
          </form>
        </>
      ) : (
        <>
          <span className="mt-5 flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Two-factor check</h1>
          <p className="mt-2 text-center text-sm text-ink/60">
            Open your authenticator app and enter the 6-digit code for this account.
          </p>

          <form onSubmit={(e) => void submitMfa(e)} className="frame mt-8 w-full space-y-5 p-6 sm:p-8" noValidate>
            <Field id="code" label="Authenticator code" error={errors.code} required>
              <input
                id="code"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="field-input text-center font-mono !text-2xl tracking-[0.5em]"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoComplete="one-time-code"
                autoFocus
              />
            </Field>

            {formError && (
              <p className="field-error !text-sm" role="alert">{formError}</p>
            )}

            <button type="submit" className="btn-clay w-full" disabled={busy || code.length !== 6}>
              {busy ? 'Verifying…' : 'Verify & sign in'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials')
                setCode('')
                setFormError('')
              }}
              className="w-full text-center text-xs font-semibold text-ink/60 hover:text-ink"
            >
              ← Back to sign in
            </button>
          </form>
        </>
      )}
    </div>
  )
}
