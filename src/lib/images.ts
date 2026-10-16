/**
 * Bundled imagery. Seed data and the admin image pickers reference these with
 * stable `asset:` keys; anything else (a full https URL) is passed through so
 * coordinators can also hot-link their own hosted images.
 */
import hero from '@/assets/img/hero.jpg'
import heroVideo from '@/assets/img/hero.mp4'
import heroPoster from '@/assets/img/hero-poster.jpg'
import eventCommemoration from '@/assets/img/event-commemoration.jpg'
import eventCaravan from '@/assets/img/event-caravan.jpg'
import eventWorkshop from '@/assets/img/event-workshop.jpg'
import storyHeritage from '@/assets/img/story-heritage.jpg'
import storyCulture from '@/assets/img/story-culture.jpg'

const ASSETS: Record<string, string> = {
  'asset:hero': hero,
  'asset:event-commemoration': eventCommemoration,
  'asset:event-caravan': eventCaravan,
  'asset:event-workshop': eventWorkshop,
  'asset:story-heritage': storyHeritage,
  'asset:story-culture': storyCulture,
}

export const HERO_IMAGE = hero
export const HERO_VIDEO = heroVideo
export const HERO_POSTER = heroPoster

export const EVENT_IMAGE_OPTIONS = [
  { value: '', label: 'No image' },
  { value: 'asset:event-commemoration', label: 'Commemoration candles' },
  { value: 'asset:event-caravan', label: 'Cultural festival' },
  { value: 'asset:event-workshop', label: 'Storytelling workshop' },
  { value: 'asset:story-culture', label: 'Beadwork & craft' },
  { value: 'asset:story-heritage', label: 'Old Munsieville street' },
] as const

export const STORY_IMAGE_OPTIONS = [
  { value: '', label: 'No image' },
  { value: 'asset:story-heritage', label: 'Old Munsieville street' },
  { value: 'asset:story-culture', label: 'Beadwork & craft' },
  { value: 'asset:event-commemoration', label: 'Commemoration candles' },
  { value: 'asset:event-caravan', label: 'Cultural festival' },
  { value: 'asset:event-workshop', label: 'Storytelling workshop' },
] as const

export function resolveImage(ref: string | null | undefined): string | null {
  if (!ref) return null
  return ASSETS[ref] ?? ref
}
