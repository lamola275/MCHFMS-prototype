import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { Registration } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateShort, isPastEvent } from '@/lib/format'
import { PageLoading, EmptyState, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export default function MyRegistrations() {
  const { user } = useAuth()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('event_registrations')
        .select('*, events(*)')
        .eq('volunteer_id', user.id)
        .order('created_at', { ascending: false })
      if (qErr) throw qErr
      setRegistrations((data ?? []) as Registration[])
    } catch (err) {
      setError(friendlyError(err, 'We could not load your registrations.'))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void load()
  }, [load])

  const cancel = async (reg: Registration) => {
    try {
      const { error: dErr } = await supabase.from('event_registrations').delete().eq('id', reg.id)
      if (dErr) throw dErr
      toast.success(`Registration for “${reg.events?.title ?? 'the event'}” cancelled.`)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not cancel that registration.'))
    }
  }

  if (loading) return <PageLoading label="Loading your registrations…" />
  if (error) return <ErrorState body={error} onRetry={() => void load()} />

  const upcoming = registrations.filter((r) => r.events && !isPastEvent(r.events.event_date))
  const past = registrations.filter((r) => !r.events || isPastEvent(r.events.event_date))

  if (registrations.length === 0) {
    return (
      <EmptyState
        title="No registrations yet"
        body="When you register for an event it will appear here, with quick links to details and cancellation."
        action={
          <Link to="/events" className="btn-clay mt-2">Browse upcoming events</Link>
        }
      />
    )
  }

  const renderCard = (reg: Registration) => {
    const ev = reg.events
    if (!ev) return null
    const past = isPastEvent(ev.event_date)
    return (
      <div key={reg.id} className={`frame flex flex-wrap items-center gap-4 p-5 ${past ? 'opacity-70' : ''}`}>
        <div className="min-w-0 flex-1">
          <Link to={`/events/${ev.id}`} className="font-display text-xl font-semibold hover:underline">
            {ev.title}
          </Link>
          <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink/60">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4 text-clay" /> {formatDateShort(ev.event_date)}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-clay" /> {ev.venue}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {past ? (
            <span className="pill pill-static border-ink/40 !text-ink/50">Attended period</span>
          ) : (
            <>
              <span className="pill pill-static border-forest !text-forest">Registered</span>
              <ConfirmDialog
                trigger={<button className="btn-ghost-ink !px-4 !py-2 !text-xs">Cancel</button>}
                title="Cancel this registration?"
                description={`This frees your place at “${ev.title}” for another volunteer.`}
                confirmLabel="Yes, cancel"
                destructive
                onConfirm={() => cancel(reg)}
              />
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-semibold">Upcoming</h2>
          <div className="mt-4 space-y-3">{upcoming.map(renderCard)}</div>
        </section>
      )}
      {past.length > 0 && (
        <section>
          <h2 className="font-display text-2xl font-semibold text-ink/50">Past</h2>
          <div className="mt-4 space-y-3">{past.map(renderCard)}</div>
        </section>
      )}
    </div>
  )
}
