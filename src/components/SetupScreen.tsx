import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { CircleAlert, Database, KeyRound, Link2, ListChecks } from 'lucide-react'
import { saveSupabaseConfig } from '@/lib/supabase'
import { BrandLockup } from '@/components/Brand'

/**
 * Shown only when no Supabase connection is configured (no .env values and no
 * previously saved settings). Lets the owner point the app at their Supabase
 * project without a rebuild. Stores ONLY the project URL + anon key locally —
 * all application data lives in Supabase Postgres.
 */
export function SetupScreen() {
  const [url, setUrl] = useState('')
  const [anonKey, setAnonKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const connect = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const cleanUrl = url.trim().replace(/\/+$/, '')
    const cleanKey = anonKey.trim()

    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(cleanUrl)) {
      setError('Enter your Project URL in the form https://your-project.supabase.co')
      return
    }
    if (cleanKey.length < 40) {
      setError('That anon key looks too short — copy the full "anon public" key from Supabase.')
      return
    }

    setBusy(true)
    try {
      const test = createClient(cleanUrl, cleanKey)
      // A head-count query proves the URL, key AND schema are all in place.
      const { error: qErr } = await test.from('events').select('id', { count: 'exact', head: true })
      if (qErr) {
        if (qErr.message.toLowerCase().includes('relation') || qErr.message.toLowerCase().includes('does not exist') || qErr.code === '42P01') {
          throw new Error('Connected, but the database tables are missing. Run supabase/schema.sql in the Supabase SQL Editor first (step 2).')
        }
        throw new Error(qErr.message)
      }
      saveSupabaseConfig(cleanUrl, cleanKey)
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not connect. Check the URL and key and try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      <div className="grain-overlay" />
      <header className="border-b-[1.5px] border-ink">
        <div className="mx-auto flex h-[68px] max-w-5xl items-center px-4 sm:px-6">
          <BrandLockup />
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <section>
          <p className="label-caps text-clay">One-time setup</p>
          <h1 className="mt-3 font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
            Connect your Supabase database
          </h1>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/65">
            This app keeps every event, volunteer, registration and archive story in a cloud-hosted Supabase Postgres
            database. Connect a project once and the whole system comes online.
          </p>

          <ol className="mt-8 space-y-5">
            {[
              {
                icon: Database,
                title: 'Create a free Supabase project',
                body: 'Sign up at supabase.com, click “New project”, choose a name and database password, and wait for provisioning.',
              },
              {
                icon: ListChecks,
                title: 'Run the schema script',
                body: 'Open SQL Editor in your project, paste the full contents of supabase/schema.sql from this repository, and press Run. It creates the tables, security policies, triggers and seed content.',
              },
              {
                icon: KeyRound,
                title: 'Copy your API settings',
                body: 'Go to Project Settings → API and copy the Project URL and the anon public key into the form on the right.',
              },
            ].map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan font-display text-lg font-semibold">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-semibold">
                    <step.icon className="h-4 w-4 text-clay" /> {step.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/60">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>

          <p className="mt-8 rounded-xl border-[1.5px] border-ink/30 bg-tan/40 px-4 py-3 text-xs leading-relaxed text-ink/60">
            Running the app locally instead? Create a <code className="font-mono font-semibold">.env</code> file from{' '}
            <code className="font-mono font-semibold">.env.example</code> and this screen disappears — see the README
            for the full Supabase + GitHub guide.
          </p>
        </section>

        <section>
          <form onSubmit={(e) => void connect(e)} className="frame p-6 sm:p-8" noValidate>
            <p className="label-caps text-ink/50">Project connection</p>
            <h2 className="mt-2 font-display text-2xl font-semibold">API settings</h2>

            <div className="mt-6 space-y-5">
              <div>
                <label htmlFor="sb-url" className="field-label">Project URL</label>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <input
                    id="sb-url"
                    className="field-input !pl-10"
                    placeholder="https://abcdefgh.supabase.co"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    autoComplete="off"
                    inputMode="url"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="sb-key" className="field-label">anon public key</label>
                <textarea
                  id="sb-key"
                  className="field-input min-h-[110px] resize-y font-mono !text-xs"
                  placeholder="eyJhbGciOiJIUzI1NiIs…"
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  autoComplete="off"
                  spellCheck={false}
                />
                <p className="mt-1.5 text-xs text-ink/45">
                  Safe to use in the browser — your data is protected by Row Level Security policies, not by secrecy of
                  this key. Never use the <em>service_role</em> key here.
                </p>
              </div>

              {error && (
                <p className="field-error !text-sm" role="alert">
                  <CircleAlert className="h-4 w-4 shrink-0" /> {error}
                </p>
              )}

              <button type="submit" className="btn-clay w-full" disabled={busy}>
                {busy ? 'Testing connection…' : 'Test connection & connect'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  )
}
