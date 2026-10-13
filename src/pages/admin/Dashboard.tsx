import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { CalendarDays, Users, BookOpen, ClipboardList, ArrowRight } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { supabase } from '@/lib/supabase'
import type { EventRow, Registration } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateShort, formatDateTime } from '@/lib/format'
import { PageLoading, ErrorState } from '@/components/states'

interface DashData {
  upcomingCount: number
  volunteerCount: number
  storyCount: number
  registrationCount: number
  chart: { name: string; registered: number; capacity: number }[]
  recent: Registration[]
}

const CHART_COLORS = ['#9D3D2C', '#D8A22E', '#2F5D3A', '#E2574C', '#9DB489', '#7E3123']

export default function Dashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const today = new Date().toISOString().slice(0, 10)
      const [upcoming, volunteers, stories, registrations, recent] = await Promise.all([
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('event_date', today),
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('heritage_stories').select('id', { count: 'exact', head: true }),
        supabase.from('event_registrations').select('id', { count: 'exact', head: true }),
        supabase
          .from('event_registrations')
          .select('*, events(title, event_date), profiles(full_name, email)')
          .order('created_at', { ascending: false })
          .limit(6),
      ])
      for (const r of [upcoming, volunteers, stories, registrations, recent]) {
        if (r.error) throw r.error
      }

      const { data: upcomingEvents, error: ueErr } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .gte('event_date', today)
        .order('event_date', { ascending: true })
        .limit(6)
      if (ueErr) throw ueErr

      const chart = await Promise.all(
        ((upcomingEvents ?? []) as EventRow[]).map(async (e) => {
          const { data: count } = await supabase.rpc('event_registration_count', { p_event_id: e.id })
          return {
            name: e.title.length > 22 ? `${e.title.slice(0, 22)}…` : e.title,
            registered: (count as number) ?? 0,
            capacity: e.capacity,
          }
        }),
      )

      setData({
        upcomingCount: upcoming.count ?? 0,
        volunteerCount: volunteers.count ?? 0,
        storyCount: stories.count ?? 0,
        registrationCount: registrations.count ?? 0,
        chart,
        recent: (recent.data ?? []) as Registration[],
      })
    } catch (err) {
      setError(friendlyError(err, 'We could not load the dashboard.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading label="Loading dashboard…" />
  if (error || !data) return <ErrorState body={error} onRetry={() => void load()} />

  const stats = [
    { label: 'Upcoming events', value: data.upcomingCount, icon: CalendarDays, to: '/admin/events' },
    { label: 'Registered volunteers', value: data.volunteerCount, icon: Users, to: '/admin/volunteers' },
    { label: 'Archive stories', value: data.storyCount, icon: BookOpen, to: '/admin/stories' },
    { label: 'Total registrations', value: data.registrationCount, icon: ClipboardList, to: '/admin/events' },
  ]

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to} className="frame group p-5 transition-transform hover:-translate-y-0.5 hover:shadow-offset-sm">
            <div className="flex items-center justify-between">
              <s.icon className="h-5 w-5 text-clay" />
              <ArrowRight className="h-4 w-4 text-ink/30 transition-transform group-hover:translate-x-1 group-hover:text-ink" />
            </div>
            <p className="mt-4 font-display text-4xl font-semibold">{s.value}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/50">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        {/* Chart */}
        <section className="frame p-6">
          <h2 className="font-display text-xl font-semibold">Registrations per upcoming event</h2>
          <p className="mt-1 text-xs text-ink/50">Compared with venue capacity</p>
          {data.chart.length === 0 ? (
            <p className="py-14 text-center text-sm text-ink/50">No upcoming events yet — create one under Events.</p>
          ) : (
            <div className="mt-4 h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#16120F' }} interval={0} angle={-18} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#16120F' }} />
                  <Tooltip
                    cursor={{ fill: 'rgba(22,18,15,0.06)' }}
                    contentStyle={{ border: '1.5px solid #16120F', borderRadius: 12, background: '#FCF7F1', fontSize: 12 }}
                    formatter={(value, name) => [value, name === 'registered' ? 'Registered' : 'Capacity']}
                  />
                  <Bar dataKey="capacity" fill="#F0DBA8" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="registered" radius={[6, 6, 0, 0]}>
                    {data.chart.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Recent registrations */}
        <section className="frame p-6">
          <h2 className="font-display text-xl font-semibold">Latest registrations</h2>
          {data.recent.length === 0 ? (
            <p className="py-14 text-center text-sm text-ink/50">No volunteer registrations yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {data.recent.map((r) => (
                <li key={r.id} className="py-3">
                  <p className="text-sm font-semibold">{r.profiles?.full_name ?? 'Unknown volunteer'}</p>
                  <p className="mt-0.5 text-xs text-ink/55">
                    → {r.events?.title ?? 'Unknown event'}
                    {r.events?.event_date ? ` (${formatDateShort(r.events.event_date)})` : ''}
                  </p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.1em] text-ink/40">{formatDateTime(r.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
