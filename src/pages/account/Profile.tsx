import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import { profileSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { SKILL_OPTIONS } from '@/lib/types'
import { Field } from '@/components/Field'
import { formatDateLong } from '@/lib/format'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [form, setForm] = useState({ full_name: '', phone: '', primary_skill: '' })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? '',
        phone: profile.phone ?? '',
        primary_skill: profile.primary_skill ?? '',
      })
    }
  }, [profile])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    if (!user) return

    const parsed = profileSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(fieldErrors(parsed.error))
      return
    }

    setBusy(true)
    try {
      const { error: uErr } = await supabase
        .from('profiles')
        .update({
          full_name: parsed.data.full_name,
          phone: parsed.data.phone || null,
          primary_skill: parsed.data.primary_skill || null,
        })
        .eq('id', user.id)
      if (uErr) throw uErr
      await refreshProfile()
      toast.success('Your profile has been updated.')
    } catch (err) {
      toast.error(friendlyError(err, 'We could not save your profile. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <form onSubmit={(e) => void submit(e)} className="frame space-y-5 p-6 sm:p-8" noValidate>
        <h2 className="font-display text-2xl font-semibold">Volunteer profile</h2>
        <Field id="full_name" label="Full name" error={errors.full_name} required>
          <input
            id="full_name"
            className="field-input"
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            autoComplete="name"
          />
        </Field>
        <Field id="email" label="Email address" hint="Your email is your sign-in identity and cannot be changed here.">
          <input id="email" className="field-input" value={profile?.email ?? user?.email ?? ''} disabled readOnly />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="phone" label="Phone" error={errors.phone}>
            <input
              id="phone"
              className="field-input"
              placeholder="073 123 4567"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              autoComplete="tel"
            />
          </Field>
          <Field id="primary_skill" label="Primary skill" error={errors.primary_skill}>
            <select
              id="primary_skill"
              className="field-input"
              value={form.primary_skill}
              onChange={(e) => setForm((f) => ({ ...f, primary_skill: e.target.value }))}
            >
              <option value="">Choose…</option>
              {SKILL_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </Field>
        </div>
        <button type="submit" className="btn-clay" disabled={busy}>
          <Save className="h-4 w-4" /> {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>

      <aside className="space-y-4">
        <div className="frame bg-tan/50 p-6">
          <p className="label-caps text-ink/50">Member since</p>
          <p className="mt-1 font-display text-xl font-semibold">
            {profile?.created_at ? formatDateLong(profile.created_at.slice(0, 10)) : '—'}
          </p>
        </div>
        <div className="frame bg-tan/50 p-6">
          <p className="label-caps text-ink/50">Why coordinators ask for your skill</p>
          <p className="mt-2 text-sm leading-relaxed text-ink/65">
            Your primary skill helps coordinators match volunteers to what each event needs — storytellers for the
            archive days, photographers for the Caravan, marshals for 16 June.
          </p>
        </div>
      </aside>
    </div>
  )
}
