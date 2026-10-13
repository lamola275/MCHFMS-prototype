import { Link } from 'react-router'
import { MapPin, Clock, Users } from 'lucide-react'
import type { EventRow } from '@/lib/types'
import { dateParts, formatTime, isPastEvent } from '@/lib/format'

const ACCENTS = ['bg-mustard', 'bg-sage', 'bg-coral', 'bg-tan'] as const

export function SeatsBadge({ capacity, registered, past }: { capacity: number; registered: number; past: boolean }) {
  if (past) return <span className="pill pill-static border-ink/40 !text-ink/50">Event ended</span>
  const left = Math.max(capacity - registered, 0)
  if (left <= 0) return <span className="pill pill-static border-clay !bg-clay !text-cream">Fully booked</span>
  if (left <= Math.max(3, Math.ceil(capacity * 0.15)))
    return <span className="pill pill-static border-coral !text-coral">Only {left} left</span>
  return <span className="pill pill-static">{left} places left</span>
}

export function EventCard({
  event,
  registeredCount = 0,
  accentIndex = 0,
}: {
  event: EventRow
  registeredCount?: number
  accentIndex?: number
}) {
  const { day, month, year } = dateParts(event.event_date)
  const past = isPastEvent(event.event_date)
  const accent = ACCENTS[accentIndex % ACCENTS.length]

  return (
    <Link
      to={`/events/${event.id}`}
      className={`frame group flex h-full flex-col p-5 transition-transform duration-300 hover:-translate-y-1 hover:shadow-offset ${past ? 'opacity-70' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`flex h-[72px] w-[72px] shrink-0 flex-col items-center justify-center rounded-2xl border-[1.5px] border-ink ${accent}`}>
          <span className="font-display text-3xl font-semibold leading-none">{day}</span>
          <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.18em]">
            {month} {year}
          </span>
        </div>
        <span className="pill pill-static !normal-case !tracking-normal">{event.category}</span>
      </div>

      <h3 className="mt-4 font-display text-[22px] font-semibold leading-tight tracking-tight group-hover:underline group-hover:decoration-clay group-hover:decoration-2 group-hover:underline-offset-4">
        {event.title}
      </h3>

      <div className="mt-3 space-y-1.5 text-sm text-ink/65">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-clay" /> {event.venue}
        </p>
        {event.start_time && (
          <p className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-clay" /> Starts {formatTime(event.start_time)}
          </p>
        )}
        <p className="flex items-center gap-2">
          <Users className="h-4 w-4 shrink-0 text-clay" /> Capacity {event.capacity}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 pt-5">
        <SeatsBadge capacity={event.capacity} registered={registeredCount} past={past} />
        <span className="link-dotted text-xs font-semibold uppercase tracking-[0.12em]">Details</span>
      </div>
    </Link>
  )
}
