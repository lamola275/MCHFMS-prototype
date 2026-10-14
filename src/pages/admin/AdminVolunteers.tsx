import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Search, ChevronRight, Download } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateShort } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { PageLoading, ErrorState, EmptyState } from '@/components/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminVolunteers() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      const rows = (data ?? []) as Profile[]
      setProfiles(rows)
      const counts = await Promise.all(
        rows.map((p) =>
          supabase
            .from('event_registrations')
            .select('id', { count: 'exact', head: true })
            .eq('volunteer_id', p.id)
            .then((r) => [p.id, r.error ? 0 : (r.count ?? 0)] as const),
        ),
      )
      setRegCounts(Object.fromEntries(counts))
    } catch (err) {
      setError(friendlyError(err, 'We could not load the volunteers.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter(
      (p) =>
        p.full_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.primary_skill ?? '').toLowerCase().includes(q),
    )
  }, [profiles, query])

  const exportCsv = () => {
    downloadCsv(
      'volunteers.csv',
      ['Full name', 'Email', 'Phone', 'Primary skill', 'Role', 'Registrations', 'Joined'],
      filtered.map((p) => [
        p.full_name,
        p.email,
        p.phone ?? '',
        p.primary_skill ?? '',
        p.role,
        regCounts[p.id] ?? 0,
        formatDateShort(p.created_at.slice(0, 10)),
      ]),
    )
    toast.success('CSV downloaded.')
  }

  if (loading) return <PageLoading label="Loading volunteers…" />
  if (error) return <ErrorState body={error} onRetry={() => void load()} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="field-input !rounded-full !pl-11"
            placeholder="Search name, email, skill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search volunteers"
          />
        </div>
        <button onClick={exportCsv} className="btn-ghost-ink !px-4 !py-2 !text-xs" disabled={filtered.length === 0}>
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No volunteers match your search' : 'No volunteers yet'}
          body={query ? 'Try another search term.' : 'When community members create accounts, they will appear here.'}
        />
      ) : (
        <div className="frame overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-[1.5px] border-ink bg-tan/50 hover:bg-tan/50">
                  <TableHead className="font-bold text-ink">Volunteer</TableHead>
                  <TableHead className="font-bold text-ink">Contact</TableHead>
                  <TableHead className="font-bold text-ink">Primary skill</TableHead>
                  <TableHead className="text-center font-bold text-ink">Events</TableHead>
                  <TableHead className="font-bold text-ink">Joined</TableHead>
                  <TableHead className="text-right font-bold text-ink">History</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id} className="border-b border-ink/10">
                    <TableCell>
                      <span className="font-semibold">{p.full_name}</span>
                      {p.role === 'admin' && <span className="pill pill-static ml-2 !px-2 !py-0.5 !text-[9px]">Admin</span>}
                    </TableCell>
                    <TableCell className="text-sm">
                      <p>{p.email}</p>
                      <p className="text-ink/50">{p.phone || 'No phone'}</p>
                    </TableCell>
                    <TableCell className="text-sm">{p.primary_skill || '—'}</TableCell>
                    <TableCell className="text-center text-sm font-semibold">{regCounts[p.id] ?? 0}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateShort(p.created_at.slice(0, 10))}</TableCell>
                    <TableCell className="text-right">
                      <Link
                        to={`/admin/volunteers/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-ink px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-ink hover:text-cream"
                      >
                        View <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
