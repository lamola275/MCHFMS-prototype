import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { MailCheck, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { registerSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { SKILL_OPTIONS } from '@/lib/types'
import { Field } from '@/components/Field'
import { BrandMark } from '@/components/Brand'

export default function Register() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    primary_skill: '',
    password: '',
    confirm: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setErrors({})

    const parsed = registerSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { needsEmailConfirm } = await signUp({
        full_name: parsed.data.full_name,
        email: parsed.data.email,
        password: parsed.data.password,
        phone: parsed.data.phone || undefined,
        primary_skill: parsed.data.primary_skill || undefined,
      })
      if (needsEmailConfirm) {
        setEmailSent(true)
      } else {
        toast.success('Welcome to the Foundation! Your volunteer account is ready.')
        navigate('/', { replace: true })
      }
    } catch (err) {
      setFormError(friendlyError(err, 'We could not create your account. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (emailSent) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 text-center sm:py-24">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan">
          <MailCheck className="h-7 w-7" />
        </span>
        <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/60">
          We've sent a confirmation link to <strong>{form.email}</strong>. Click it to activate your volunteer account,
          then sign in.
        </p>
        <Link to="/login" className="btn-ink mt-8">Go to sign in</Link>
      </div>
    )
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-14 sm:py-20">
      <BrandMark className="h-12 w-12 text-clay" />
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Join as a volunteer</h1>
      <p className="mt-2 text-center text-sm text-ink/60">
        One free account lets you register for events and keeps your participation history in one place.
      </p>

      <form onSubmit={(e) => void submit(e)} className="frame mt-8 w-full space-y-5 p-6 sm:p-8" noValidate>
        <Field id="full_name" label="Full name" error={errors.full_name} required>
          <input
            id="full_name"
            className="field-input"
            placeholder="e.g. Nomvula Dlamini"
            value={form.full_name}
            onChange={set('full_name')}
            autoComplete="name"
          />
        </Field>
        <Field id="email" label="Email address" error={errors.email} required>
          <input
            id="email"
            type="email"
            className="field-input"
            placeholder="you@example.co.za"
            value={form.email}
            onChange={set('email')}
            autoComplete="email"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="phone" label="Phone (optional)" error={errors.phone}>
            <input
              id="phone"
              className="field-input"
              placeholder="073 123 4567"
              value={form.phone}
              onChange={set('phone')}
              autoComplete="tel"
            />
          </Field>
          <Field id="primary_skill" label="Primary skill (optional)" error={errors.primary_skill}>
            <select id="primary_skill" className="field-input" value={form.primary_skill} onChange={set('primary_skill')}>
              <option value="">Choose…</option>
              {SKILL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field
          id="password"
          label="Password"
          error={errors.password}
          hint="At least 8 characters, with a letter and a number."
          required
        >
          <input
            id="password"
            type="password"
            className="field-input"
            placeholder="Choose a strong password"
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
        </Field>
        <Field id="confirm" label="Confirm password" error={errors.confirm} required>
          <input
            id="confirm"
            type="password"
            className="field-input"
            placeholder="Repeat your password"
            value={form.confirm}
            onChange={set('confirm')}
            autoComplete="new-password"
          />
        </Field>

        {formError && (
          <p className="field-error !text-sm" role="alert">{formError}</p>
        )}

        <button type="submit" className="btn-clay w-full" disabled={busy}>
          <UserPlus className="h-4 w-4" /> {busy ? 'Creating your account…' : 'Create my account'}
        </button>

        <p className="text-center text-xs text-ink/55">
          Already registered? <Link to="/login" className="link-dotted font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  )
}
