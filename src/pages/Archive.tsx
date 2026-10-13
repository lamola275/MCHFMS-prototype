import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Story } from '@/lib/types'
import { STORY_CATEGORIES } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { StoryCard } from '@/components/StoryCard'
import { CardSkeleton, EmptyState, ErrorState } from '@/components/states'

export default function Archive() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase
        .from('heritage_stories')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })
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

  const categories = useMemo(() => {
    const present = new Set(stories.map((s) => s.category))
    return ['all', ...STORY_CATEGORIES.filter((c) => present.has(c))]
  }, [stories])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return stories.filter((s) => {
      const matchesCategory = category === 'all' || s.category === category
      const matchesQuery =
        !q ||
        s.title.toLowerCase().includes(q) ||
        s.content.toLowerCase().includes(q) ||
        (s.contributor ?? '').toLowerCase().includes(q)
      return matchesCategory && matchesQuery
    })
  }, [stories, query, category])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="label-caps text-clay">Collective memory</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">The heritage archive</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink/65">
          Stories of the Munsieville Four, the liberation struggle and everyday life in our township — gathered from
          elders, families and neighbours, and preserved here for the next generation.
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
          <input
            type="search"
            className="field-input !rounded-full !pl-11"
            placeholder="Search stories, people, places…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search the archive"
          />
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by theme">
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory(c)} className={`pill ${category === c ? 'pill-active' : ''}`}>
              {c === 'all' ? 'All themes' : c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10">
        {loading ? (
          <CardSkeleton count={6} />
        ) : error ? (
          <ErrorState body={error} onRetry={() => void load()} />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={query || category !== 'all' ? 'No stories match your search' : 'The archive is being prepared'}
            body={
              query || category !== 'all'
                ? 'Try a different search term or theme.'
                : 'Coordinators are digitising the first community stories — please visit again soon.'
            }
          />
        ) : (
          <div className="masonry">
            {filtered.map((s) => (
              <StoryCard key={s.id} story={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
