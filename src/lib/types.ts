/** Database row types — mirror of supabase/schema.sql */

export type Role = 'volunteer' | 'admin'

export interface Profile {
  id: string
  full_name: string
  email: string
  phone: string | null
  primary_skill: string | null
  role: Role
  created_at: string
}

export type EventStatus = 'draft' | 'published' | 'cancelled'

export interface EventRow {
  id: string
  title: string
  description: string
  category: string
  event_date: string // ISO date, YYYY-MM-DD
  start_time: string | null // HH:MM:SS
  venue: string
  capacity: number
  image_url: string | null
  status: EventStatus
  created_by: string | null
  created_at: string
}

export type RegistrationStatus = 'registered' | 'cancelled'

export interface Registration {
  id: string
  event_id: string
  volunteer_id: string
  status: RegistrationStatus
  created_at: string
  events?: EventRow
  profiles?: Profile
}

export interface Story {
  id: string
  title: string
  category: string
  contributor: string | null
  content: string
  image_url: string | null
  published: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface CommunityStats {
  upcoming_events: number
  archive_stories: number
  volunteers: number
  registrations: number
}

export const EVENT_CATEGORIES = [
  'Commemoration',
  'Cultural Festival',
  'Workshop',
  'Heritage Education',
  'Community Programme',
] as const

export const STORY_CATEGORIES = [
  'Munsieville Four',
  'Liberation History',
  'Cultural Heritage',
  'Community Memory',
  'Arts & Music',
] as const

export const SKILL_OPTIONS = [
  'Storytelling & oral history',
  'Photography & media',
  'Music & performance',
  'Logistics & transport',
  'Catering & hospitality',
  'Marshalling & safety',
  'Admin & registration',
  'Gardening & site care',
  'Other',
] as const
