import { z } from 'zod'

export const passwordAuthSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})
export type PasswordAuthValues = z.infer<typeof passwordAuthSchema>

export const magicLinkSchema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
})
export type MagicLinkValues = z.infer<typeof magicLinkSchema>
