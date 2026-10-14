import { useState } from 'react'
import { Link } from 'react-router'
import { MailCheck, KeyRound } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { friendlyError } from '@/lib/errors'
import { Field } from '@/components/Field'
import { BrandMark } from '@/components/Brand'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address')
      return
    }
    setBusy(true)
    try {
      const { error: rErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (rErr) throw rErr
      setSent(true)
    } catch (err) {
      setError(friendlyError(err, 'We could not send the reset email. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:py-24">
      <BrandMark className="h-12 w-12 text-clay" />
      {sent ? (
        <div className="mt-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan">
            <MailCheck className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Reset email sent</h1>
          <p className="mt-3 text-sm leading-relaxed text-ink/60">
            If an account exists for <strong>{email}</strong>, a password-reset link is on its way. It expires soon, so
            check your inbox (and spam folder) now.
          </p>
          <Link to="/login" className="btn-ghost-ink mt-8">Back to sign in</Link>
        </div>
      ) : (
        <>
          <span className="mt-6 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan">
            <KeyRound className="h-6 w-6" />
          </span>
          <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Reset your password</h1>
          <p className="mt-2 text-center text-sm text-ink/60">
            Enter the email you registered with and we'll send you a reset link.
          </p>
          <form onSubmit={(e) => void submit(e)} className="frame mt-8 w-full space-y-5 p-6 sm:p-8" noValidate>
            <Field id="email" label="Email address" error={error} required>
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
            <button type="submit" className="btn-clay w-full" disabled={busy}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
            <p className="text-center text-xs text-ink/55">
              Remembered it? <Link to="/login" className="link-dotted font-semibold">Sign in</Link>
            </p>
          </form>
        </>
      )}
    </div>
  )
}
