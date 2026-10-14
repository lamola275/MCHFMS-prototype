import { z } from 'zod'

/** Shared field validators */
const email = z.string().trim().min(1, 'Email is required').email('Enter a valid email address')
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
const phone = z
  .string()
  .trim()
  .regex(/^[+\d][\d\s()-]{6,19}$/, 'Enter a valid phone number (e.g. 073 123 4567)')
  .optional()
  .or(z.literal(''))

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Please enter your full name').max(100, 'Name is too long'),
    email,
    phone,
    primary_skill: z.string().max(80, 'Skill description is too long').optional().or(z.literal('')),
    password,
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'Passwords do not match',
  })

export const profileSchema = z.object({
  full_name: z.string().trim().min(2, 'Please enter your full name').max(100, 'Name is too long'),
  phone,
  primary_skill: z.string().max(80, 'Skill description is too long').optional().or(z.literal('')),
})

export const changePasswordSchema = z
  .object({
    password,
    confirm: z.string().min(1, 'Please confirm your password'),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' })

export const totpSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app'),
})

const optionalImageUrl = z
  .string()
  .trim()
  .max(500, 'Image reference is too long')
  .optional()
  .or(z.literal(''))
  .refine(
    (v) => !v || v.startsWith('asset:') || /^https?:\/\/.+/i.test(v) || v.startsWith('/'),
    'Enter a valid image URL (https://…) or choose a gallery image',
  )

export const eventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150, 'Title is too long'),
  category: z.string().trim().min(1, 'Choose a category'),
  event_date: z
    .string()
    .min(1, 'Date is required')
    .refine((v) => !Number.isNaN(Date.parse(v)), 'Enter a valid date'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Enter a valid time (HH:MM)').optional().or(z.literal('')),
  venue: z.string().trim().min(2, 'Venue is required').max(150, 'Venue is too long'),
  capacity: z
    .number({ message: 'Capacity must be a number' })
    .int('Capacity must be a whole number')
    .min(1, 'Capacity must be at least 1')
    .max(100000, 'Capacity is unrealistically large'),
  status: z.enum(['draft', 'published', 'cancelled']),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000, 'Description is too long'),
  image_url: optionalImageUrl,
})

export const storySchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(200, 'Title is too long'),
  category: z.string().trim().min(1, 'Choose a category'),
  contributor: z.string().trim().max(100, 'Contributor name is too long').optional().or(z.literal('')),
  content: z.string().trim().min(20, 'Story content must be at least 20 characters').max(50000, 'Story is too long'),
  image_url: optionalImageUrl,
  published: z.boolean(),
})

/** Convert a ZodError into a { field: message } map for inline form errors. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '_')
    if (!out[key]) out[key] = issue.message
  }
  return out
}
