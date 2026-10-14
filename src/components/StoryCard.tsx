import { Link } from 'react-router'
import { Feather } from 'lucide-react'
import type { Story } from '@/lib/types'
import { resolveImage } from '@/lib/images'

function excerpt(content: string, length = 180): string {
  const clean = content.replace(/\s+/g, ' ').trim()
  return clean.length > length ? `${clean.slice(0, length).trimEnd()}…` : clean
}

export function StoryCard({ story }: { story: Story }) {
  const img = resolveImage(story.image_url)

  return (
    <Link
      to={`/archive/${story.id}`}
      className="frame group block overflow-hidden transition-transform duration-300 hover:-translate-y-1 hover:shadow-offset"
    >
      {img ? (
        <div className="overflow-hidden border-b-[1.5px] border-ink">
          <img
            src={img}
            alt=""
            loading="lazy"
            className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        </div>
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center border-b-[1.5px] border-ink bg-tan">
          <Feather className="h-10 w-10 text-ink/30" />
        </div>
      )}
      <div className="p-5">
        <span className="pill pill-static !normal-case !tracking-normal">{story.category}</span>
        <h3 className="mt-3 font-display text-[21px] font-semibold leading-snug tracking-tight group-hover:underline group-hover:decoration-clay group-hover:decoration-2 group-hover:underline-offset-4">
          {story.title}
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{excerpt(story.content)}</p>
        {story.contributor && (
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45">
            Shared by {story.contributor}
          </p>
        )}
      </div>
    </Link>
  )
}
