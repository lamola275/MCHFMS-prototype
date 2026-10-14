import { format, parseISO, isBefore, startOfToday } from 'date-fns'

/** '2026-11-14' -> 'Saturday, 14 November 2026' */
export function formatDateLong(isoDate: string | null | undefined): string {
  if (!isoDate) return 'Date to be confirmed'
  try {
    return format(parseISO(isoDate), 'EEEE, d MMMM yyyy')
  } catch {
    return isoDate
  }
}

/** '2026-11-14' -> 'Sat, 14 Nov 2026' */
export function formatDateShort(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBC'
  try {
    return format(parseISO(isoDate), 'EEE, d MMM yyyy')
  } catch {
    return isoDate
  }
}

/** '14:00:00' -> '14:00' */
export function formatTime(time: string | null | undefined): string {
  if (!time) return ''
  return time.slice(0, 5)
}

/** Date block for event cards */
export function dateParts(isoDate: string | null | undefined): { day: string; month: string; year: string } {
  if (!isoDate) return { day: '–', month: 'TBC', year: '' }
  try {
    const d = parseISO(isoDate)
    return { day: format(d, 'd'), month: format(d, 'MMM'), year: format(d, 'yyyy') }
  } catch {
    return { day: '–', month: 'TBC', year: '' }
  }
}

export function isPastEvent(isoDate: string | null | undefined): boolean {
  if (!isoDate) return false
  try {
    return isBefore(parseISO(isoDate), startOfToday())
  } catch {
    return false
  }
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return format(parseISO(iso), 'd MMM yyyy, HH:mm')
  } catch {
    return iso
  }
}
