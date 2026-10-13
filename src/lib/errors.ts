/**
 * Central error translation: turns low-level Supabase / Postgres / network
 * errors into friendly, actionable messages for community users.
 */

interface MaybeCodedError {
  message?: string
  code?: string
  status?: number
}

export function friendlyError(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback
  const e = err as MaybeCodedError
  const msg = (e.message ?? '').toLowerCase()

  // Network / connectivity
  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'Could not reach the server. Please check your internet connection and try again.'
  }

  // Postgres error codes
  if (e.code === '23505') return 'This record already exists.'
  if (e.code === '23503') return 'This record is linked to other data and cannot be changed.'
  if (e.code === '23514') return 'One of the values is outside its allowed range. Please check the form and try again.'
  if (e.code === '42501' || msg.includes('row-level security') || msg.includes('row level security')) {
    return 'You do not have permission to perform this action.'
  }

  // Database trigger messages (capacity / registration rules)
  if (msg.includes('fully booked')) return 'This event is fully booked.'
  if (msg.includes('not open for registration')) return 'This event is not open for registration.'
  if (msg.includes('already passed')) return 'This event has already taken place.'
  if (msg.includes('cannot change your own role') || msg.includes('role')) {
    if (msg.includes('role')) return 'Only an administrator can change user roles.'
  }

  // Auth errors
  if (msg.includes('invalid login credentials')) return 'The email or password is incorrect. Please try again.'
  if (msg.includes('email not confirmed')) return 'Please confirm your email address first — check your inbox for the confirmation link.'
  if (msg.includes('user already registered')) return 'An account with this email already exists. Try signing in instead.'
  if (msg.includes('password') && msg.includes('at least')) return 'Your password does not meet the minimum requirements.'
  if (msg.includes('rate limit') || msg.includes('too many requests')) return 'Too many attempts. Please wait a moment and try again.'
  if (msg.includes('invalid') && (msg.includes('totp') || msg.includes('code') || msg.includes('otp'))) {
    return 'That verification code is not correct. Check your authenticator app and try again.'
  }
  if (msg.includes('expired') && msg.includes('code')) return 'That code has expired. Please request a new one.'

  // PostgREST not found
  if (e.code === 'PGRST116' || msg.includes('0 rows') || msg.includes('not found')) return 'The requested record could not be found.'

  return e.message && e.message.length < 140 ? e.message! : fallback
}

/** Registration-specific duplicate message */
export function registrationError(err: unknown): string {
  const e = err as MaybeCodedError
  if (e?.code === '23505') return 'You are already registered for this event.'
  return friendlyError(err, 'We could not complete your registration. Please try again.')
}
