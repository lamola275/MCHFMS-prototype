import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { EventRow, Registration } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateLong, formatDateTime, formatTime } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoading, ErrorState, EmptyState } from '@/components/states'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function AdminEventRegistrations() {
  const { id } = useParams<{ id: string }>()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) {
      setError('Missing event id.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const [evRes, regRes] = await Promise.all([
        supabase.from('events').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('event_registrations')
          .select('*, profiles(full_name, email, phone, primary_skill)')
          .eq('event_id', id)
          .order('created_at', { ascending: true }),
      ])
      if (evRes.error) throw evRes.error
      if (regRes.error) throw regRes.error
      if (!evRes.data) {
        setError('This event could not be found.')
        return
      }
      setEvent(evRes.data as EventRow)
      setRegistrations((regRes.data ?? []) as Registration[])
    } catch (err) {
      setError(friendlyError(err, 'We could not load the registrations.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  const removeRegistration = async (reg: Registration) => {
    try {
      const { error: dErr } = await supabase.from('event_registrations').delete().eq('id', reg.id)
      if (dErr) throw dErr
      toast.success(`${reg.profiles?.full_name ?? 'The volunteer'} has been removed from this event.`)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'Could not remove that registration.'))
    }
  }

  const exportCsv = () => {
    if (!event) return
    downloadCsv(
      `registrations-${event.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`,
      ['Full name', 'Email', 'Phone', 'Primary skill', 'Registered at'],
      registrations.map((r) => [
        r.profiles?.full_name ?? '',
        r.profiles?.email ?? '',
        r.profiles?.phone ?? '',
        r.profiles?.primary_skill ?? '',
        formatDateTime(r.created_at),
      ]),
    )
    toast.success('CSV downloaded.')
  }

  if (loading) return <PageLoading label="Loading registrations…" />
  if (error || !event) return <ErrorState title="Event unavailable" body={error} onRetry={() => void load()} />

  const seatsLeft = Math.max(event.capacity - registrations.length, 0)

  return (
    <div className="space-y-6">
      <Link to="/admin/events" className="inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> All events
      </Link>

      <div className="frame flex flex-wrap items-center justify-between gap-4 bg-tan/50 p-6">
        <div>
          <h2 className="font-display text-2xl font-semibold">{event.title}</h2>
          <p className="mt-1 text-sm text-ink/60">
            {formatDateLong(event.event_date)}
            {event.start_time ? ` · from ${formatTime(event.start_time)}` : ''} · {event.venue}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-display text-3xl font-semibold">{registrations.length}<span className="text-lg text-ink/40">/{event.capacity}</span></p>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink/50">{seatsLeft} places left</p>
          </div>
          <button onClick={exportCsv} className="btn-ghost-ink !px-4 !py-2 !text-xs" disabled={registrations.length === 0}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
        </div>
      </div>

      {registrations.length === 0 ? (
        <EmptyState title="No registrations yet" body="When volunteers register for this event, their details will appear here for coordination." />
      ) : (
        <div className="frame overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-[1.5px] border-ink bg-tan/50 hover:bg-tan/50">
                  <TableHead className="font-bold text-ink">Volunteer</TableHead>
                  <TableHead className="font-bold text-ink">Contact</TableHead>
                  <TableHead className="font-bold text-ink">Primary skill</TableHead>
                  <TableHead className="font-bold text-ink">Registered</TableHead>
                  <TableHead className="text-right font-bold text-ink">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.map((r) => (
                  <TableRow key={r.id} className="border-b border-ink/10">
                    <TableCell className="font-semibold">{r.profiles?.full_name ?? '—'}</TableCell>
                    <TableCell className="text-sm">
                      <p>{r.profiles?.email ?? '—'}</p>
                      <p className="text-ink/50">{r.profiles?.phone || 'No phone'}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.profiles?.primary_skill || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(r.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <ConfirmDialog
                        trigger={
                          <button
                            className="rounded-full border-[1.5px] border-clay p-2 text-clay transition-colors hover:bg-clay hover:text-cream"
                            aria-label={`Remove ${r.profiles?.full_name ?? 'volunteer'}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        }
                        title={`Remove ${r.profiles?.full_name ?? 'this volunteer'}?`}
                        description={`They will lose their place at “${event.title}” and a seat will open up.`}
                        confirmLabel="Remove registration"
                        destructive
                        onConfirm={() => removeRegistration(r)}
                      />
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
