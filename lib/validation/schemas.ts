/**
 * TEENS PARTY MOROCCO - Validation Schemas
 * ========================================
 *
 * Schémas Zod réutilisables pour la validation
 * côté client et serveur.
 */

import { z } from 'zod'

/* ==========================================================================
   SANITIZERS
   ========================================================================== */

/**
 * Supprime les caractères dangereux HTML/JS
 */
export function sanitizeString(value: string): string {
  return value
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/data:/gi, '') // Remove data: protocol
    .trim()
}

/**
 * Échappe les caractères HTML (utilisé dans les transformers Zod)
 */
function escapeHtmlForSchema(value: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return value.replace(/[&<>"']/g, (m) => map[m] || m)
}

/**
 * Normalise les espaces
 */
export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/* ==========================================================================
   TRANSFORMERS - Zod preprocess
   ========================================================================== */

/**
 * Préprocesseur pour sanitiser et normaliser les strings
 */
export const sanitizedString = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val
    return normalizeWhitespace(sanitizeString(val))
  },
  z.string()
)

/**
 * Préprocesseur pour trim basique
 */
export const trimmedString = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.string()
)

/* ==========================================================================
   COMMON FIELD SCHEMAS
   ========================================================================== */

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .min(1, 'L\'email est requis')
  .email('Format d\'email invalide')
  .max(255, 'Email trop long')
  .transform((val) => val.toLowerCase().trim())

/**
 * Password validation
 * - Minimum 8 caractères
 * - Au moins une majuscule, une minuscule, un chiffre
 */
export const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(100, 'Mot de passe trop long')
  .regex(/[A-Z]/, 'Doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Doit contenir au moins un chiffre')

/**
 * Password confirmation
 */
export const passwordConfirmSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

/**
 * Phone (Morocco)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+212|0)[5-7]\d{8}$/,
    'Format de téléphone invalide (ex: 0612345678)'
  )

/**
 * Phone (optionnel)
 */
export const optionalPhoneSchema = z
  .string()
  .regex(/^(\+212|0)[5-7]\d{8}$/, 'Format de téléphone invalide')
  .optional()
  .or(z.literal(''))

/**
 * Nom/Prénom
 */
export const nameSchema = z
  .string()
  .min(2, 'Minimum 2 caractères')
  .max(50, 'Maximum 50 caractères')
  .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Caractères invalides')
  .transform(normalizeWhitespace)

/**
 * Pseudo
 */
export const pseudoSchema = z
  .string()
  .min(3, 'Minimum 3 caractères')
  .max(20, 'Maximum 20 caractères')
  .regex(/^[a-zA-Z0-9_]+$/, 'Lettres, chiffres et underscores uniquement')

/**
 * URL
 */
export const urlSchema = z
  .string()
  .url('URL invalide')
  .refine(
    (url) => url.startsWith('https://'),
    'L\'URL doit commencer par https://'
  )

/**
 * UUID
 */
export const uuidSchema = z
  .string()
  .uuid('Identifiant invalide')

/**
 * Date (YYYY-MM-DD)
 */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
  .refine((date) => !isNaN(Date.parse(date)), 'Date invalide')

/**
 * Date de naissance (10-18 ans)
 */
export const teenBirthDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide')
  .refine(
    (date) => {
      const birth = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birth.getFullYear()
      const monthDiff = today.getMonth() - birth.getMonth()
      const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())
        ? age - 1
        : age
      return actualAge >= 10 && actualAge <= 18
    },
    'L\'âge doit être entre 10 et 18 ans'
  )

/**
 * Montant (prix)
 */
export const priceSchema = z
  .number()
  .min(0, 'Le montant ne peut pas être négatif')
  .max(100000, 'Montant trop élevé')
  .transform((val) => Math.round(val * 100) / 100) // 2 décimales

/**
 * Texte long (description)
 */
export const descriptionSchema = z
  .string()
  .max(2000, 'Maximum 2000 caractères')
  .transform(sanitizeString)

/**
 * Texte court (commentaire)
 */
export const shortTextSchema = z
  .string()
  .max(500, 'Maximum 500 caractères')
  .transform(sanitizeString)

/* ==========================================================================
   FORM SCHEMAS - Formulaires complets
   ========================================================================== */

/**
 * Login form
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
  remember: z.boolean().optional().default(false),
})

export type LoginInput = z.infer<typeof loginSchema>

/**
 * Register form
 */
export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  firstName: nameSchema,
  lastName: nameSchema,
  phone: phoneSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'Vous devez accepter les conditions' }),
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type RegisterInput = z.infer<typeof registerSchema>

/**
 * Contact form
 */
export const contactSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  subject: z.string().min(5, 'Minimum 5 caractères').max(100, 'Maximum 100 caractères'),
  message: z.string().min(20, 'Minimum 20 caractères').max(2000, 'Maximum 2000 caractères'),
})

export type ContactInput = z.infer<typeof contactSchema>

/**
 * Newsletter form
 */
export const newsletterSchema = z.object({
  email: emailSchema,
  acceptMarketing: z.boolean().optional().default(true),
})

export type NewsletterInput = z.infer<typeof newsletterSchema>

/**
 * Profile update form
 */
export const updateProfileSchema = z.object({
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  phone: optionalPhoneSchema,
  avatarUrl: z.string().url().optional().or(z.literal('')),
})

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>

/**
 * Change password form
 */
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.newPassword !== data.currentPassword, {
  message: 'Le nouveau mot de passe doit être différent',
  path: ['newPassword'],
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>

/* ==========================================================================
   BOOKING SCHEMAS
   ========================================================================== */

/**
 * Réservation événement
 */
export const eventBookingSchema = z.object({
  eventId: uuidSchema,
  teenIds: z.array(uuidSchema).min(1, 'Sélectionnez au moins un enfant'),
  ticketType: z.enum(['standard', 'vip', 'early_bird']),
  quantity: z.number().int().min(1).max(10),
  promoCode: z.string().max(20).optional(),
  notes: shortTextSchema.optional(),
})

export type EventBookingInput = z.infer<typeof eventBookingSchema>

/**
 * Réservation anniversaire
 */
export const birthdayBookingSchema = z.object({
  teenId: uuidSchema,
  packageId: uuidSchema,
  date: dateSchema,
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Format d\'heure invalide'),
  guestCount: z.number().int().min(5, 'Minimum 5 invités').max(50, 'Maximum 50 invités'),
  theme: z.string().max(100).optional(),
  specialRequests: descriptionSchema.optional(),
  cakeOption: z.enum(['none', 'basic', 'custom']).optional(),
})

export type BirthdayBookingInput = z.infer<typeof birthdayBookingSchema>

/**
 * Inscription club
 */
export const clubRegistrationSchema = z.object({
  clubId: uuidSchema,
  teenId: uuidSchema,
  sessionIds: z.array(uuidSchema).min(1, 'Sélectionnez au moins une session'),
  medicalInfo: shortTextSchema.optional(),
  emergencyContact: z.object({
    name: nameSchema,
    phone: phoneSchema,
    relation: z.string().max(50),
  }),
})

export type ClubRegistrationInput = z.infer<typeof clubRegistrationSchema>

/* ==========================================================================
   UTILITY FUNCTIONS
   ========================================================================== */

/**
 * Valide et retourne les données ou les erreurs formatées
 */
export function validateForm<T extends z.ZodSchema>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data)

  if (result.success) {
    return { success: true, data: result.data }
  }

  const errors: Record<string, string> = {}
  for (const error of result.error.errors) {
    const path = error.path.join('.')
    if (!errors[path]) {
      errors[path] = error.message
    }
  }

  return { success: false, errors }
}

/**
 * Extrait les erreurs Zod en format simple
 */
export function formatZodErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const issue of error.issues) {
    const path = issue.path.join('.')
    if (!errors[path]) {
      errors[path] = issue.message
    }
  }

  return errors
}

/**
 * Type helper pour les erreurs de formulaire
 */
export type FormErrors<T> = Partial<Record<keyof T, string>>
