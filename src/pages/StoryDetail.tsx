import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Story } from '@/lib/types'
import { friendlyError } from '@/lib/errors'
import { formatDateLong } from '@/lib/format'
import { resolveImage } from '@/lib/images'
import { PageLoading, ErrorState } from '@/components/states'

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [story, setStory] = useState<Story | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    if (!id) {
      setError('This story link is incomplete.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data, error: qErr } = await supabase.from('heritage_stories').select('*').eq('id', id).maybeSingle()
      if (qErr) throw qErr
      if (!data) {
        setError('This story could not be found. It may have been unpublished or removed.')
        return
      }
      setStory(data as Story)
    } catch (err) {
      setError(friendlyError(err, 'We could not load this story.'))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) return <PageLoading label="Opening the archive…" />
  if (error || !story) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <ErrorState title="Story unavailable" body={error || 'This story could not be found.'} onRetry={() => void load()} />
        <div className="mt-6 text-center">
          <Link to="/archive" className="link-dotted text-sm font-semibold uppercase tracking-[0.12em]">
            Back to the archive
          </Link>
        </div>
      </div>
    )
  }

  const img = resolveImage(story.image_url)

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-ink/60 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <span className="pill pill-static !normal-case !tracking-normal">{story.category}</span>
      <h1 className="mt-4 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-balance sm:text-5xl">
        {story.title}
      </h1>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-ink/50">
        {story.contributor ? `Shared by ${story.contributor} · ` : ''}
        {formatDateLong(story.created_at.slice(0, 10))}
      </p>

      {img && (
        <img
          src={img}
          alt=""
          className="mt-8 w-full rounded-[1.2rem] border-[1.5px] border-ink object-cover"
        />
      )}

      <div className="mt-8 space-y-5 font-display text-[17px] leading-[1.75] text-ink/85">
        {story.content.split(/\n{2,}/).map((para, i) => (
          <p key={i} className={i === 0 ? 'first-letter:float-left first-letter:mr-2 first-letter:font-display first-letter:text-6xl first-letter:font-semibold first-letter:leading-[0.85] first-letter:text-clay' : ''}>
            {para}
          </p>
        ))}
      </div>

      <div className="mt-12 rounded-[1.2rem] border-[1.5px] border-ink bg-tan/50 p-6 text-center">
        <p className="font-display text-xl font-semibold">Have a story of your own?</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink/60">
          The archive grows through community memory. Speak to a Foundation coordinator at any event, and your story
          can be preserved here too.
        </p>
        <Link to="/events" className="btn-ghost-ink mt-5">Join an upcoming event</Link>
      </div>
    </article>
  )
}
