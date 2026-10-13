import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Pencil, Trash2, Users, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { EventRow, EventStatus } from '@/lib/types'
import { EVENT_CATEGORIES } from '@/lib/types'
import { eventSchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { formatDateShort, isPastEvent } from '@/lib/format'
import { EVENT_IMAGE_OPTIONS } from '@/lib/images'
import { Field } from '@/components/Field'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoading, ErrorState, EmptyState } from '@/components/states'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface EventFormState {
  title: string
  category: string
  event_date: string
  start_time: string
  venue: string
  capacity: string
  status: EventStatus
  description: string
  image_url: string
}

const EMPTY_FORM: EventFormState = {
  title: '',
  category: EVENT_CATEGORIES[0],
  event_date: '',
  start_time: '',
  venue: '',
  capacity: '50',
  status: 'published',
  description: '',
  image_url: '',
}

function statusBadge(status: EventStatus, past: boolean) {
  if (past) return <span className="pill pill-static border-ink/40 !text-ink/50">Past</span>
  if (status === 'published') return <span className="pill pill-static border-forest !text-forest">Published</span>
  if (status === 'cancelled') return <span className="pill pill-static border-clay !text-clay">Cancelled</span>
  return <span className="pill pill-static border-mustard !text-mustard">Draft</span>
}

export default function AdminEvents() {
  const [events, setEvents] = useState<EventRow[]>([])
  const [regCounts, setRegCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [form, setForm] = useState<EventFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('events').select('*').order('event_date', { ascending: false })
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter((e) => e.title.toLowerCase().includes(q) || e.venue.toLowerCase().includes(q) || e.category.toLowerCase().includes(q))
  }, [events, query])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (e: EventRow) => {
    setEditing(e)
    setForm({
      title: e.title,
      category: e.category,
      event_date: e.event_date,
      start_time: e.start_time ? e.start_time.slice(0, 5) : '',
      venue: e.venue,
      capacity: String(e.capacity),
      status: e.status,
      description: e.description,
      image_url: e.image_url ?? '',
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormErrors({})

    const parsed = eventSchema.safeParse({
      ...form,
      capacity: form.capacity === '' ? NaN : Number(form.capacity),
      image_url: form.image_url,
    })
    if (!parsed.success) {
      setFormErrors(fieldErrors(parsed.error))
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: parsed.data.title,
        category: parsed.data.category,
        event_date: parsed.data.event_date,
        start_time: parsed.data.start_time || null,
        venue: parsed.data.venue,
        capacity: parsed.data.capacity,
        status: parsed.data.status,
        description: parsed.data.description,
        image_url: parsed.data.image_url || null,
      }
      if (editing) {
        const { error: uErr } = await supabase.from('events').update(payload).eq('id', editing.id)
        if (uErr) throw uErr
        toast.success(`“${payload.title}” has been updated.`)
      } else {
        const { error: iErr } = await supabase.from('events').insert(payload)
        if (iErr) throw iErr
        toast.success(`“${payload.title}” has been created.`)
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not save the event.'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (e: EventRow) => {
    try {
      const { error: dErr } = await supabase.from('events').delete().eq('id', e.id)
      if (dErr) throw dErr
      toast.success(`“${e.title}” and its registrations have been deleted.`)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not delete the event.'))
    }
  }

  if (loading) return <PageLoading label="Loading events…" />
  if (error) return <ErrorState body={error} onRetry={() => void load()} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="field-input !rounded-full !pl-11"
            placeholder="Search events…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search events"
          />
        </div>
        <button onClick={openCreate} className="btn-clay">
          <Plus className="h-4 w-4" /> New event
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No events match your search' : 'No events yet'}
          body={query ? 'Try another search term.' : 'Create the Foundation’s first event to open volunteer registration.'}
          action={!query ? <button onClick={openCreate} className="btn-clay mt-2"><Plus className="h-4 w-4" /> Create an event</button> : undefined}
        />
      ) : (
        <div className="frame overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-[1.5px] border-ink bg-tan/50 hover:bg-tan/50">
                  <TableHead className="font-bold text-ink">Event</TableHead>
                  <TableHead className="font-bold text-ink">Date</TableHead>
                  <TableHead className="font-bold text-ink">Venue</TableHead>
                  <TableHead className="text-center font-bold text-ink">Registered</TableHead>
                  <TableHead className="font-bold text-ink">Status</TableHead>
                  <TableHead className="text-right font-bold text-ink">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((e) => (
                  <TableRow key={e.id} className="border-b border-ink/10">
                    <TableCell>
                      <Link to={`/events/${e.id}`} className="font-semibold hover:underline">{e.title}</Link>
                      <p className="text-xs text-ink/50">{e.category}</p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateShort(e.event_date)}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-sm">{e.venue}</TableCell>
                    <TableCell className="text-center text-sm font-semibold">
                      <Link to={`/admin/events/${e.id}`} className="link-dotted">
                        {regCounts[e.id] ?? 0}/{e.capacity}
                      </Link>
                    </TableCell>
                    <TableCell>{statusBadge(e.status, isPastEvent(e.event_date))}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/admin/events/${e.id}`}
                          className="rounded-full border-[1.5px] border-ink p-2 transition-colors hover:bg-ink hover:text-cream"
                          title="View registrants"
                          aria-label={`View registrants for ${e.title}`}
                        >
                          <Users className="h-3.5 w-3.5" />
                        </Link>
                        <button
                          onClick={() => openEdit(e)}
                          className="rounded-full border-[1.5px] border-ink p-2 transition-colors hover:bg-ink hover:text-cream"
                          title="Edit event"
                          aria-label={`Edit ${e.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ConfirmDialog
                          trigger={
                            <button
                              className="rounded-full border-[1.5px] border-clay p-2 text-clay transition-colors hover:bg-clay hover:text-cream"
                              title="Delete event"
                              aria-label={`Delete ${e.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                          title={`Delete “${e.title}”?`}
                          description="This permanently removes the event and all of its volunteer registrations. This cannot be undone."
                          confirmLabel="Delete event"
                          destructive
                          onConfirm={() => remove(e)}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="frame max-h-[92vh] max-w-2xl overflow-y-auto !rounded-[1.2rem]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit event' : 'Create a new event'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void save(e)} className="mt-2 grid gap-5" noValidate>
            <Field id="ev-title" label="Event title" error={formErrors.title} required>
              <input
                id="ev-title"
                className="field-input"
                placeholder="e.g. 16 June Commemoration 2027"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="ev-category" label="Category" error={formErrors.category} required>
                <select
                  id="ev-category"
                  className="field-input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {EVENT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field id="ev-status" label="Status" error={formErrors.status} hint="Drafts are hidden from the public.">
                <select
                  id="ev-status"
                  className="field-input"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EventStatus }))}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </Field>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Field id="ev-date" label="Date" error={formErrors.event_date} required>
                <input
                  id="ev-date"
                  type="date"
                  className="field-input"
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                />
              </Field>
              <Field id="ev-time" label="Start time (optional)" error={formErrors.start_time}>
                <input
                  id="ev-time"
                  type="time"
                  className="field-input"
                  value={form.start_time}
                  onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                />
              </Field>
              <Field id="ev-capacity" label="Volunteer capacity" error={formErrors.capacity} required>
                <input
                  id="ev-capacity"
                  type="number"
                  min={1}
                  className="field-input"
                  value={form.capacity}
                  onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
                />
              </Field>
            </div>
            <Field id="ev-venue" label="Venue" error={formErrors.venue} required>
              <input
                id="ev-venue"
                className="field-input"
                placeholder="e.g. Munsieville Community Hall"
                value={form.venue}
                onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))}
              />
            </Field>
            <Field id="ev-image" label="Gallery image (optional)" error={formErrors.image_url} hint="Choose a bundled image or paste a full https:// image URL.">
              <select
                id="ev-image"
                className="field-input"
                value={EVENT_IMAGE_OPTIONS.some((o) => o.value === form.image_url) ? form.image_url : form.image_url ? '__custom' : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v !== '__custom') setForm((f) => ({ ...f, image_url: v }))
                }}
              >
                {EVENT_IMAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="__custom">Custom URL…</option>
              </select>
              {form.image_url !== '' && !EVENT_IMAGE_OPTIONS.some((o) => o.value === form.image_url) && (
                <input
                  className="field-input mt-2"
                  placeholder="https://…"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  aria-label="Custom image URL"
                />
              )}
            </Field>
            <Field id="ev-description" label="Description" error={formErrors.description} required>
              <textarea
                id="ev-description"
                className="field-input min-h-[130px] resize-y"
                placeholder="What is this event about, what should volunteers expect, what should they bring?"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-ghost-ink">
                Cancel
              </button>
              <button type="submit" className="btn-clay" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
