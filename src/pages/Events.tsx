import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { EventRow } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { isPastEvent } from '@/lib/format'
import { EventCard } from '@/components/EventCard'
import { CardSkeleton, EmptyState, ErrorState } from '@/components/states'

export default function Events() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string>('all')
  const [showPast, setShowPast] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('events')
        .select('*')
        .neq('status', 'draft')
        .order('event_date', { ascending: true })
      if (qErr) throw qErr
      const evts = (data ?? []) as EventRow[]
      setEvents(evts)
      const counts = await Promise.all(
        evts.map((e) => supabase.rpc('event_registration_count', { p_event_id: e.id }).then((r) => [e.id, r.error ? 0 : (r.data as number)] as const)),
      )
      setRegCounts(Object.fromEntries(counts))
    } catch (err) {
      setError(friendlyError(err, 'We could not load the events.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const categories = useMemo(() => ['all', ...Array.from(new Set(events.map((e) => e.category)))], [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return events.filter((e) => {
      const matchesCategory = category === 'all' || e.category === category
      const matchesQuery =
        !q || e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [events, query, category])

  const upcoming = filtered.filter((e) => !isPastEvent(e.event_date) && e.status !== 'cancelled')
  const cancelled = filtered.filter((e) => e.status === 'cancelled' && !isPastEvent(e.event_date))
  const past = filtered.filter((e) => isPastEvent(e.event_date))

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="label-caps text-clay">What's on</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Events & programmes</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/65">
          Commemorations, festivals and workshops — register as a volunteer for any open event. Places are limited, so
          sign up early.
        </p>
      </header>

      {/* Search + filters */}
      <div className="mt-8 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="field-input !rounded-full !pl-11"
            placeholder="Search events, venues…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`pill ${category === c ? 'pill-active' : ''}`}>
              {c === 'all' ? 'All' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {loading ? (
          <CardSkeleton count={6} />
        ) : error ? (
          <ErrorState body={error} onRetry={() => void load()} />
        ) : upcoming.length + cancelled.length === 0 ? (
          <EmptyState
            title={query || category !== 'all' ? 'No events match your search' : 'No upcoming events'}
            body={
              query || category !== 'all'
                ? 'Try a different search term or category.'
                : 'The Foundation is planning its next programme — please check back soon.'
            }
          />
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[...upcoming, ...cancelled].map((e, i) => (
                <div key={e.id} className="relative">
                  {e.status === 'cancelled' && (
                    <span className="absolute -top-3 left-4 z-10 rounded-full border-[1.5px] border-clay bg-clay px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cream">
                      Cancelled
                    </span>
                  )}
                  <EventCard event={e} registeredCount={regCounts[e.id] ?? 0} accentIndex={i} />
                </div>
              ))}
            </div>

            {past.length > 0 && (
              <div className="mt-14">
                <button
                  onClick={() => setShowPast((v) => !v)}
                  className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.12em] text-ink/60 hover:text-ink"
                  aria-expanded={showPast}
                >
                  {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  Past events ({past.length})
                </button>
                {showPast && (
                  <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {past.map((e, i) => (
                      <EventCard key={e.id} event={e} registeredCount={regCounts[e.id] ?? 0} accentIndex={i} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
