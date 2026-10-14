import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { BrandMark } from '@/components/Brand'

export function PageLoading({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-24" role="status" aria-live="polite">
      <BrandMark className="h-10 w-10 animate-pulse text-clay" />
      <p className="label-caps text-ink/50">{label}</p>
    </div>
  )
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="frame overflow-hidden">
          <Skeleton className="h-44 w-full rounded-none bg-ink/8" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-24 bg-ink/8" />
            <Skeleton className="h-6 w-3/4 bg-ink/8" />
            <Skeleton className="h-4 w-full bg-ink/8" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <div className="frame flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-ink bg-tan">
        <Inbox className="h-6 w-6" />
      </span>
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      {body && <p className="max-w-md text-sm leading-relaxed text-ink/60">{body}</p>}
      {action}
    </div>
  )
}

export function ErrorState({
  title = 'Something went wrong',
  body,
  onRetry,
}: {
  title?: string
  body?: string
  onRetry?: () => void
}) {
  return (
    <div className="frame flex flex-col items-center gap-4 px-6 py-16 text-center" role="alert">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-clay bg-clay/10 text-clay">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="font-display text-2xl font-semibold">{title}</h3>
      {body && <p className="max-w-md text-sm leading-relaxed text-ink/60">{body}</p>}
      {onRetry && (
        <button onClick={onRetry} className="btn-ghost-ink mt-2">
          <RotateCcw className="h-4 w-4" /> Try again
        </button>
      )}
    </div>
  )
}
