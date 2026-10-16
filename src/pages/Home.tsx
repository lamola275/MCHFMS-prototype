import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, CalendarDays, BookOpen, Users, Flame } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { CommunityStats, EventRow, Story } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { HERO_VIDEO, HERO_POSTER } from '@/lib/images'
import { EventCard } from '@/components/EventCard'
import { StoryCard } from '@/components/StoryCard'
import { CardSkeleton, ErrorState } from '@/components/states'

export default function Home() {
  const [stats, setStats] = useState<CommunityStats | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [statsRes, eventsRes, storiesRes] = await Promise.all([
        supabase.rpc('community_stats'),
        supabase
          .from('events')
          .select('*')
          .eq('status', 'published')
          .gte('event_date', new Date().toISOString().slice(0, 10))
          .order('event_date', { ascending: true })
          .limit(3),
        supabase.from('heritage_stories').select('*').eq('published', true).order('created_at', { ascending: false }).limit(3),
      ])
      if (statsRes.error) throw statsRes.error
      if (eventsRes.error) throw eventsRes.error
      if (storiesRes.error) throw storiesRes.error

      setStats(statsRes.data as CommunityStats)
      const evts = (eventsRes.data ?? []) as EventRow[]
      setEvents(evts)
      setStories((storiesRes.data ?? []) as Story[])

      const counts = await Promise.all(
        evts.map((e) => supabase.rpc('event_registration_count', { p_event_id: e.id }).then((r) => [e.id, r.error ? 0 : (r.data as number)] as const)),
      )
      setRegCounts(Object.fromEntries(counts))
    } catch (err) {
      setError(friendlyError(err, 'We could not load the homepage content.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div>
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-clay text-cream">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="animate-fade-up">
            <p className="label-caps flex items-center gap-2 text-tan">
              <Flame className="h-4 w-4" /> Munsieville · Mogale City · Gauteng
            </p>
            <h1 className="mt-4 font-display text-[42px] font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl lg:text-[68px]">
              Keeping the memory of the Munsieville Four alive.
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-cream/85 sm:text-base">
              The Munsieville Cultural Heritage Foundation honours the four men executed on 16 June 1964 by turning
              remembrance into action — commemorations, cultural festivals and a living archive of our community's
              stories. Join in. Lend a hand. Add your story.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/events" className="btn-cream">
                See upcoming events <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/archive" className="btn-ghost-cream">
                Browse the heritage archive
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[520px] animate-fade-up lg:justify-self-end" style={{ animationDelay: '120ms' }}>
            <div className="absolute -inset-3 rounded-t-[999px] rounded-b-[2rem] border-[1.5px] border-cream/60" aria-hidden="true" />
            <video
              src={HERO_VIDEO}
              poster={HERO_POSTER}
              autoPlay
              muted
              loop
              playsInline
              aria-label="The Munsieville Four memorial gravesite"
              className="aspect-[4/5] w-full rounded-t-[999px] rounded-b-[1.6rem] border-[1.5px] border-ink object-cover sm:aspect-[5/5.4]"
            />
            <div className="absolute -bottom-5 left-1/2 w-max -translate-x-1/2 rounded-full border-[1.5px] border-ink bg-tan px-5 py-2 text-center shadow-offset-sm">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink">16 June 1964 · Never forgotten</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────── */}
      <section className="border-y-[1.5px] border-ink bg-tan">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x-[1.5px] divide-ink/70 px-0 sm:px-0 lg:grid-cols-4">
          {[
            { icon: CalendarDays, label: 'Upcoming events', value: stats?.upcoming_events },
            { icon: BookOpen, label: 'Archive stories', value: stats?.archive_stories },
            { icon: Users, label: 'Registered volunteers', value: stats?.volunteers },
            { icon: Flame, label: 'Event registrations', value: stats?.registrations },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1.5 px-3 py-7 text-center">
              <s.icon className="h-5 w-5 text-clay" aria-hidden="true" />
              <span className="font-display text-3xl font-semibold sm:text-4xl">{s.value ?? '–'}</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-ink/55">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      {error ? (
        <div className="mx-auto max-w-3xl px-4 py-16">
          <ErrorState body={error} onRetry={() => void load()} />
        </div>
      ) : (
        <>
          {/* ── Upcoming events ────────────────────────────── */}
          <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="label-caps text-clay">Gather with us</p>
                <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                  Upcoming events & programmes
                </h2>
              </div>
              <Link to="/events" className="link-dotted text-sm font-semibold uppercase tracking-[0.12em]">
                All events
              </Link>
            </div>
            <div className="mt-8">
              {loading ? (
                <CardSkeleton count={3} />
              ) : events.length === 0 ? (
                <div className="frame px-6 py-12 text-center text-sm text-ink/60">
                  No events are scheduled right now — check back soon, or browse the archive below.
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {events.map((e, i) => (
                    <EventCard key={e.id} event={e} registeredCount={regCounts[e.id] ?? 0} accentIndex={i} />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* ── Archive preview ────────────────────────────── */}
          <section className="border-t-[1.5px] border-ink bg-secondary/40">
            <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="label-caps text-clay">Collective memory</p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                    From the heritage archive
                  </h2>
                </div>
                <Link to="/archive" className="link-dotted text-sm font-semibold uppercase tracking-[0.12em]">
                  Full archive
                </Link>
              </div>
              <div className="mt-8">
                {loading ? (
                  <CardSkeleton count={3} />
                ) : (
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {stories.map((s) => (
                      <StoryCard key={s.id} story={s} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>
        </>
      )}

      {/* ── About ────────────────────────────────────────── */}
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-24">
        <div>
          <p className="label-caps text-clay">Who we are</p>
          <h2 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            Culture as a tool for community, education and healing.
          </h2>
        </div>
        <div className="space-y-4 text-[15px] leading-relaxed text-ink/70">
          <p>
            The Munsieville Cultural Heritage Foundation is a non-profit arts, culture and heritage organisation rooted
            in Munsieville, Mogale City. We exist to preserve and promote the legacy of the Munsieville Four — whose
            sacrifice on 16 June 1964 is woven into our township's history — and to open that history to young people
            through arts, culture and storytelling.
          </p>
          <p>
            Every year we mark 16 June with a community commemoration, travel with the African Cultural Caravan, and
            run programmes where elders, artists and young people meet. This system is how we coordinate it all:
            events, volunteers and the stories that must never be lost.
          </p>
          <blockquote className="border-l-[3px] border-clay pl-4 font-display text-xl italic text-ink">
            “A community that remembers its history raises children who know their worth.”
          </blockquote>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────── */}
      <section className="border-t-[1.5px] border-ink bg-forest text-cream">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 py-16 text-center sm:px-6">
          <p className="label-caps text-tan">Volunteer with the Foundation</p>
          <h2 className="max-w-2xl font-display text-3xl font-semibold leading-tight tracking-tight text-balance sm:text-5xl">
            Ready to lend a hand at the next commemoration?
          </h2>
          <p className="max-w-xl text-sm leading-relaxed text-cream/80">
            Create a volunteer profile, register for events in two taps, and help keep Munsieville's heritage alive —
            whether your gift is storytelling, photography, cooking or marshalling.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/register" className="btn-cream">
              Join as a volunteer <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/events" className="btn-ghost-cream">
              Browse events first
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
