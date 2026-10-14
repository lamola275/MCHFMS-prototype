import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, CalendarDays, Clock, MapPin, Users, BadgeCheck, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/use-auth'
import type { EventRow } from '@/lib/types'
import { friendlyError, registrationError } from '@/lib/errors'
import { formatDateLong, formatTime, isPastEvent } from '@/lib/format'
import { PageLoading, ErrorState } from '@/components/states'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { resolveImage } from '@/lib/images'
import { Progress } from '@/components/ui/progress'

export default function EventDetail() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [event, setEvent] = useState<EventRow | null>(null)
  const [registeredCount, setRegisteredCount] = useState(0)
  const [myRegistrationId, setMyRegistrationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!id) {
      setError('This event link is incomplete.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('events').select('*').eq('id', id).maybeSingle()
      if (qErr) throw qErr
      if (!data) {
        setError('This event could not be found. It may have been removed.')
        return
      }
      setEvent(data as EventRow)

      const countRes = await supabase.rpc('event_registration_count', { p_event_id: id })
      if (!countRes.error) setRegisteredCount(countRes.data as number)

      if (user) {
        const { data: reg, error: regErr } = await supabase
          .from('event_registrations')
          .select('id')
          .eq('event_id', id)
          .eq('volunteer_id', user.id)
          .maybeSingle()
        if (regErr) throw regErr
        setMyRegistrationId(reg?.id ?? null)
      } else {
        setMyRegistrationId(null)
      }
    } catch (err) {
      setError(friendlyError(err, 'We could not load this event.'))
    } finally {
      setLoading(false)
    }
  }, [id, user])

  useEffect(() => {
    void load()
  }, [load])

  const register = async () => {
    if (!user || !event) return
    setBusy(true)
    try {
      const { error: iErr } = await supabase
        .from('event_registrations')
        .insert({ event_id: event.id, volunteer_id: user.id })
      if (iErr) throw iErr
      toast.success(`You're registered for “${event.title}”. See you there!`)
      await load()
    } catch (err) {
      toast.error(registrationError(err))
    } finally {
      setBusy(false)
    }
  }

  const cancelRegistration = async () => {
    if (!myRegistrationId) return
    setBusy(true)
    try {
      const { error: dErr } = await supabase.from('event_registrations').delete().eq('id', myRegistrationId)
      if (dErr) throw dErr
      toast.success('Your registration has been cancelled.')
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not cancel your registration. Please try again.'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <PageLoading label="Loading event…" />
  if (error || !event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState title="Event unavailable" body={error || 'This event could not be found.'} onRetry={() => void load()} />
        <div className="mt-6 text-center">
          <Link to="/events" className="link-dotted text-sm font-semibold uppercase tracking-[0.12em]">
            Back to all events
          </Link>
        </div>
      </div>
    )
  }

  const past = isPastEvent(event.event_date)
  const seatsLeft = Math.max(event.capacity - registeredCount, 0)
  const full = seatsLeft <= 0
  const pct = Math.min(100, Math.round((registeredCount / event.capacity) * 100))
  const img = resolveImage(event.image_url)

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr]">
        {/* Main content */}
        <article>
          <div className="flex flex-wrap items-center gap-2">
            <span className="pill pill-static !normal-case !tracking-normal">{event.category}</span>
            {event.status === 'cancelled' && (
              <span className="pill pill-static border-clay !bg-clay !text-cream">Cancelled</span>
            )}
            {past && <span className="pill pill-static border-ink/40 !text-ink/50">Past event</span>}
          </div>

          <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.05] tracking-tight text-balance sm:text-5xl">
            {event.title}
          </h1>

          <div className="mt-6 grid gap-3 rounded-[1.2rem] border-[1.5px] border-ink bg-tan/50 p-5 sm:grid-cols-3">
            <p className="flex items-start gap-2.5 text-sm">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <span className="label-caps block text-ink/50">Date</span>
                <span className="font-semibold">{formatDateLong(event.event_date)}</span>
              </span>
            </p>
            {event.start_time && (
              <p className="flex items-start gap-2.5 text-sm">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
                <span>
                  <span className="label-caps block text-ink/50">Time</span>
                  <span className="font-semibold">From {formatTime(event.start_time)}</span>
                </span>
              </p>
            )}
            <p className="flex items-start gap-2.5 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-clay" />
              <span>
                <span className="label-caps block text-ink/50">Venue</span>
                <span className="font-semibold">{event.venue}</span>
              </span>
            </p>
          </div>

          {img && (
            <img
              src={img}
              alt=""
              className="mt-8 aspect-[16/9] w-full rounded-[1.2rem] border-[1.5px] border-ink object-cover"
            />
          )}

          <div className="prose-like mt-8 space-y-4 text-[15px] leading-relaxed text-ink/75">
            {event.description.split(/\n{2,}/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </article>

        {/* RSVP panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="frame p-6">
            <p className="label-caps text-ink/50">Volunteer registration</p>

            <div className="mt-4 flex items-end justify-between">
              <span className="font-display text-4xl font-semibold">{seatsLeft}</span>
              <span className="pb-1 text-xs font-semibold uppercase tracking-[0.12em] text-ink/50">
                of {event.capacity} places left
              </span>
            </div>
            <Progress value={pct} className="mt-3 h-2.5 border border-ink/60 bg-transparent [&>div]:bg-clay" />
            <p className="mt-2 text-xs text-ink/50">
              {registeredCount} volunteer{registeredCount === 1 ? '' : 's'} registered so far
            </p>

            <div className="mt-6">
              {past ? (
                <p className="rounded-xl bg-ink/5 px-4 py-3 text-sm text-ink/60">
                  This event has already taken place. Browse <Link to="/events" className="link-dotted font-semibold">upcoming events</Link> to get involved.
                </p>
              ) : event.status === 'cancelled' ? (
                <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm text-clay">
                  This event has been cancelled by the coordinators.
                </p>
              ) : !user ? (
                <div className="space-y-3">
                  <p className="text-sm text-ink/60">Sign in or create a free volunteer account to register for this event.</p>
                  <Link to="/login" state={{ from: `/events/${event.id}` }} className="btn-ink w-full">
                    <LogIn className="h-4 w-4" /> Sign in to register
                  </Link>
                  <Link to="/register" className="btn-ghost-ink w-full">
                    Create a volunteer account
                  </Link>
                </div>
              ) : myRegistrationId ? (
                <div className="space-y-4">
                  <p className="flex items-start gap-2.5 rounded-xl border-[1.5px] border-forest bg-forest/10 px-4 py-3 text-sm font-medium text-forest">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
                    You're registered! We'll see you on {formatDateLong(event.event_date)}.
                  </p>
                  <ConfirmDialog
                    trigger={
                      <button className="btn-ghost-ink w-full" disabled={busy}>
                        {busy ? 'Working…' : 'Cancel my registration'}
                      </button>
                    }
                    title="Cancel your registration?"
                    description={`This will free up your place at “${event.title}”. You can register again later if places are still available.`}
                    confirmLabel="Yes, cancel it"
                    destructive
                    onConfirm={cancelRegistration}
                  />
                </div>
              ) : full ? (
                <p className="rounded-xl bg-clay/10 px-4 py-3 text-sm font-medium text-clay">
                  This event is fully booked. Follow the archive for stories from the day — or register for another
                  event.
                </p>
              ) : (
                <button onClick={() => void register()} disabled={busy} className="btn-clay w-full">
                  <Users className="h-4 w-4" />
                  {busy ? 'Registering…' : 'Register as a volunteer'}
                </button>
              )}
            </div>
          </div>

          <p className="mt-4 px-2 text-xs leading-relaxed text-ink/45">
            Duplicate registrations are blocked automatically, and places are reserved first-come, first-served by the
            database — no overbooking.
          </p>
        </aside>
      </div>
    </div>
  )
}
