import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { changePasswordSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { Field } from '@/components/Field'
import { BrandMark } from '@/components/Brand'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setFormError('')

    const parsed = changePasswordSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { error: uErr } = await supabase.auth.updateUser({ password: parsed.data.password })
      if (uErr) throw uErr
      toast.success('Your password has been updated.')
      navigate('/login', { replace: true })
    } catch (err) {
      setFormError(friendlyError(err, 'We could not update your password. The link may have expired — request a new one.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-16 sm:py-24">
      <BrandMark className="h-12 w-12 text-clay" />
      <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-2 text-center text-sm text-ink/60">
        At least 8 characters, with a letter and a number.
      </p>
      <form onSubmit={(e) => void submit(e)} className="frame mt-8 w-full space-y-5 p-6 sm:p-8" noValidate>
        <Field id="password" label="New password" error={errors.password} required>
          <input
            id="password"
            type="password"
            className="field-input"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            autoComplete="new-password"
          />
        </Field>
        <Field id="confirm" label="Confirm new password" error={errors.confirm} required>
          <input
            id="confirm"
            type="password"
            className="field-input"
            value={form.confirm}
            onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
        </Field>
        {formError && <p className="field-error !text-sm" role="alert">{formError}</p>}
        <button type="submit" className="btn-clay w-full" disabled={busy}>
          {busy ? 'Updating…' : 'Update password'}
        </button>
        <p className="text-center text-xs text-ink/55">
          Link expired? <Link to="/forgot-password" className="link-dotted font-semibold">Request a new one</Link>
        </p>
      </form>
    </div>
  )
}
