/** Four-star memorial mark — one star for each of the Munsieville Four. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <circle cx="24" cy="24" r="22.5" fill="none" stroke="currentColor" strokeWidth="2.5" />
      {[
        [24, 10.5],
        [24, 37.5],
        [10.5, 24],
        [37.5, 24],
      ].map(([cx, cy]) => (
        <path
          key={`${cx}-${cy}`}
          d={`M ${cx} ${cy - 4.6} L ${cx + 1.35} ${cy - 1.35} L ${cx + 4.6} ${cy} L ${cx + 1.35} ${cy + 1.35} L ${cx} ${cy + 4.6} L ${cx - 1.35} ${cy + 1.35} L ${cx - 4.6} ${cy} L ${cx - 1.35} ${cy - 1.35} Z`}
          fill="currentColor"
        />
      ))}
      <circle cx="24" cy="24" r="3.1" fill="currentColor" />
    </svg>
  )
}

export function BrandLockup({ dark = false }: { dark?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark className={`h-9 w-9 shrink-0 ${dark ? 'text-cream' : 'text-clay'}`} />
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
