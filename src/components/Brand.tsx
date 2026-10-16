import logoUrl from '@/assets/brand/logo.png'

/** The official Munsieville Cultural Heritage Foundation emblem. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt=""
      aria-hidden="true"
      className={`object-contain ${className}`}
      draggable={false}
    />
  )
}

export function BrandLockup({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className="h-10 w-10 shrink-0" />
      <span className="leading-none">
        <span className={`block font-display text-[17px] font-semibold tracking-tight ${dark ? 'text-cream' : 'text-ink'}`}>
          Munsieville Heritage
        </span>
        <span className={`mt-1 block text-[9.5px] font-semibold uppercase tracking-[0.24em] ${dark ? 'text-cream/60' : 'text-ink/55'}`}>
          Cultural Foundation
        </span>
      </span>
    </span>
  )
}
