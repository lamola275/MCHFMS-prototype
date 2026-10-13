import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { Story } from '@/lib/types'
import { STORY_CATEGORIES } from '@/lib/types'
import { storySchema, fieldErrors } from '@/lib/validation'
import { friendlyError } from '@/lib/errors'
import { formatDateShort } from '@/lib/format'
import { STORY_IMAGE_OPTIONS } from '@/lib/images'
import { Field } from '@/components/Field'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { PageLoading, ErrorState, EmptyState } from '@/components/states'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface StoryFormState {
  title: string
  category: string
  contributor: string
  content: string
  image_url: string
  published: boolean
}

const EMPTY_FORM: StoryFormState = {
  title: '',
  category: STORY_CATEGORIES[0],
  contributor: '',
  content: '',
  image_url: '',
  published: true,
}

export default function AdminStories() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Story | null>(null)
  const [form, setForm] = useState<StoryFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('heritage_stories').select('*').order('created_at', { ascending: false })
      if (qErr) throw qErr
      setStories((data ?? []) as Story[])
    } catch (err) {
      setError(friendlyError(err, 'We could not load the archive.'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return stories
    return stories.filter(
      (s) => s.title.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.contributor ?? '').toLowerCase().includes(q),
    )
  }, [stories, query])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setDialogOpen(true)
  }

  const openEdit = (s: Story) => {
    setEditing(s)
    setForm({
      title: s.title,
      category: s.category,
      contributor: s.contributor ?? '',
      content: s.content,
      image_url: s.image_url ?? '',
      published: s.published,
    })
    setFormErrors({})
    setDialogOpen(true)
  }

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setFormErrors({})

    const parsed = storySchema.safeParse(form)
    if (!parsed.success) {
      setFormErrors(fieldErrors(parsed.error))
      return
    }

    setSaving(true)
    try {
      const payload = {
        title: parsed.data.title,
        category: parsed.data.category,
        contributor: parsed.data.contributor || null,
        content: parsed.data.content,
        image_url: parsed.data.image_url || null,
        published: parsed.data.published,
      }
      if (editing) {
        const { error: uErr } = await supabase.from('heritage_stories').update(payload).eq('id', editing.id)
        if (uErr) throw uErr
        toast.success(`“${payload.title}” has been updated.`)
      } else {
        const { error: iErr } = await supabase.from('heritage_stories').insert(payload)
        if (iErr) throw iErr
        toast.success(`“${payload.title}” has been added to the archive.`)
      }
      setDialogOpen(false)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not save the story.'))
    } finally {
      setSaving(false)
    }
  }

  const togglePublished = async (s: Story) => {
    try {
      const { error: uErr } = await supabase.from('heritage_stories').update({ published: !s.published }).eq('id', s.id)
      if (uErr) throw uErr
      setStories((prev) => prev.map((x) => (x.id === s.id ? { ...x, published: !s.published } : x)))
      toast.success(!s.published ? `“${s.title}” is now public.` : `“${s.title}” has been unpublished.`)
    } catch (err) {
      toast.error(friendlyError(err, 'Could not change the publish state.'))
    }
  }

  const remove = async (s: Story) => {
    try {
      const { error: dErr } = await supabase.from('heritage_stories').delete().eq('id', s.id)
      if (dErr) throw dErr
      toast.success(`“${s.title}” has been removed from the archive.`)
      await load()
    } catch (err) {
      toast.error(friendlyError(err, 'We could not delete the story.'))
    }
  }

  if (loading) return <PageLoading label="Loading the archive…" />
  if (error) return <ErrorState body={error} onRetry={() => void load()} />

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="field-input !rounded-full !pl-11"
            placeholder="Search stories…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search stories"
          />
        </div>
        <button onClick={openCreate} className="btn-clay">
          <Plus className="h-4 w-4" /> New story
        </button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={query ? 'No stories match your search' : 'The archive is empty'}
          body={query ? 'Try another search term.' : 'Publish the first heritage story to open the public archive.'}
          action={!query ? <button onClick={openCreate} className="btn-clay mt-2"><Plus className="h-4 w-4" /> Add a story</button> : undefined}
        />
      ) : (
        <div className="frame overflow-hidden p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-[1.5px] border-ink bg-tan/50 hover:bg-tan/50">
                  <TableHead className="font-bold text-ink">Story</TableHead>
                  <TableHead className="font-bold text-ink">Category</TableHead>
                  <TableHead className="font-bold text-ink">Contributor</TableHead>
                  <TableHead className="font-bold text-ink">Added</TableHead>
                  <TableHead className="text-center font-bold text-ink">Public</TableHead>
                  <TableHead className="text-right font-bold text-ink">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id} className="border-b border-ink/10">
                    <TableCell>
                      {s.published ? (
                        <Link to={`/archive/${s.id}`} className="font-semibold hover:underline">{s.title}</Link>
                      ) : (
                        <span className="font-semibold text-ink/60">{s.title}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{s.category}</TableCell>
                    <TableCell className="text-sm">{s.contributor || '—'}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateShort(s.created_at.slice(0, 10))}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={s.published}
                        onCheckedChange={() => void togglePublished(s)}
                        aria-label={`Toggle published for ${s.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEdit(s)}
                          className="rounded-full border-[1.5px] border-ink p-2 transition-colors hover:bg-ink hover:text-cream"
                          aria-label={`Edit ${s.title}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <ConfirmDialog
                          trigger={
                            <button
                              className="rounded-full border-[1.5px] border-clay p-2 text-clay transition-colors hover:bg-clay hover:text-cream"
                              aria-label={`Delete ${s.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          }
                          title={`Delete “${s.title}”?`}
                          description="This permanently removes the story from the heritage archive. This cannot be undone."
                          confirmLabel="Delete story"
                          destructive
                          onConfirm={() => remove(s)}
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="frame max-h-[92vh] max-w-2xl overflow-y-auto !rounded-[1.2rem]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{editing ? 'Edit story' : 'Add a heritage story'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => void save(e)} className="mt-2 grid gap-5" noValidate>
            <Field id="st-title" label="Title" error={formErrors.title} required>
              <input
                id="st-title"
                className="field-input"
                placeholder="e.g. The night the township stood still"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id="st-category" label="Theme" error={formErrors.category} required>
                <select
                  id="st-category"
                  className="field-input"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {STORY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field id="st-contributor" label="Contributor (optional)" error={formErrors.contributor} hint="Who shared this memory?">
                <input
                  id="st-contributor"
                  className="field-input"
                  placeholder="e.g. Gogo Maria S."
                  value={form.contributor}
                  onChange={(e) => setForm((f) => ({ ...f, contributor: e.target.value }))}
                />
              </Field>
            </div>
            <Field id="st-image" label="Gallery image (optional)" error={formErrors.image_url} hint="Choose a bundled image or paste a full https:// image URL.">
              <select
                id="st-image"
                className="field-input"
                value={STORY_IMAGE_OPTIONS.some((o) => o.value === form.image_url) ? form.image_url : form.image_url ? '__custom' : ''}
                onChange={(e) => {
                  const v = e.target.value
                  if (v !== '__custom') setForm((f) => ({ ...f, image_url: v }))
                }}
              >
                {STORY_IMAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
                <option value="__custom">Custom URL…</option>
              </select>
              {form.image_url !== '' && !STORY_IMAGE_OPTIONS.some((o) => o.value === form.image_url) && (
                <input
                  className="field-input mt-2"
                  placeholder="https://…"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  aria-label="Custom image URL"
                />
              )}
            </Field>
            <Field id="st-content" label="Story" error={formErrors.content} hint="Separate paragraphs with a blank line." required>
              <textarea
                id="st-content"
                className="field-input min-h-[220px] resize-y"
                placeholder="Tell the story as it was told to you…"
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </Field>
            <label className="flex items-center gap-3 text-sm font-semibold">
              <Switch
                checked={form.published}
                onCheckedChange={(v) => setForm((f) => ({ ...f, published: v }))}
                aria-label="Published"
              />
              Visible in the public archive
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDialogOpen(false)} className="btn-ghost-ink">
                Cancel
              </button>
              <button type="submit" className="btn-clay" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish story'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
