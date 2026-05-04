/**
 * TEENS PARTY MOROCCO - Teen Domain Schemas
 * =========================================
 *
 * Schémas Zod pour la validation des profils enfants.
 */

import { z } from 'zod'

/* ==========================================================================
   ENUMS & CONSTANTS
   ========================================================================== */

export const TeenProfileEnum = z.enum(['School', 'Sport', 'Créa'])
export type TeenProfile = z.infer<typeof TeenProfileEnum>

export const GenderEnum = z.enum(['male', 'female', 'other'])
export type Gender = z.infer<typeof GenderEnum>

/* ==========================================================================
   BASE SCHEMAS
   ========================================================================== */

/**
 * Pseudo validation
 * - 3-20 caractères
 * - Lettres, chiffres, underscores
 * - Pas d'espaces
 */
export const pseudoSchema = z
  .string()
  .min(3, 'Le pseudo doit contenir au moins 3 caractères')
  .max(20, 'Le pseudo ne peut pas dépasser 20 caractères')
  .regex(
    /^[a-zA-Z0-9_]+$/,
    'Le pseudo ne peut contenir que des lettres, chiffres et underscores'
  )

/**
 * Phone validation (Moroccan format)
 */
export const phoneSchema = z
  .string()
  .regex(
    /^(\+212|0)[5-7]\d{8}$/,
    'Format de téléphone invalide (ex: 0612345678 ou +212612345678)'
  )

/**
 * Date of birth validation
 * - Format YYYY-MM-DD
 * - Entre 10 et 18 ans
 */
export const dateOfBirthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format de date invalide (YYYY-MM-DD)')
  .refine(
    (date) => {
      const birthDate = new Date(date)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      return age >= 10 && age <= 18
    },
    { message: "L'enfant doit avoir entre 10 et 18 ans" }
  )

/* ==========================================================================
   INPUT SCHEMAS
   ========================================================================== */

/**
 * Schéma de création d'un profil enfant
 */
export const createTeenSchema = z.object({
  first_name: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .max(50, 'Le prénom ne peut pas dépasser 50 caractères'),

  last_name: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .max(50, 'Le nom ne peut pas dépasser 50 caractères'),

  pseudo: pseudoSchema,

  avatar_url: z.string().url('URL invalide').optional(),

  date_of_birth: dateOfBirthSchema,

  gender: GenderEnum.optional(),

  school: z.string().max(100, 'Nom d\'école trop long').optional(),

  grade_level: z.string().max(50, 'Niveau scolaire trop long').optional(),

  profiles: z
    .array(TeenProfileEnum)
    .max(2, 'Maximum 2 profils autorisés')
    .optional()
    .default([]),

  interests: z
    .array(z.string().uuid('ID d\'intérêt invalide'))
    .optional()
    .default([]),

  allergies: z
    .string()
    .max(500, 'Texte allergies trop long')
    .optional(),

  photo_consent: z.boolean().optional().default(false),

  exit_permission_rules: z
    .string()
    .max(500, 'Règles de sortie trop longues')
    .optional(),

  emergency_contact_name: z
    .string()
    .max(100, 'Nom de contact trop long')
    .optional(),

  emergency_contact_phone: phoneSchema.optional(),

  emergency_contact_relation: z
    .string()
    .max(50, 'Relation trop longue')
    .optional(),
})

export type CreateTeenInput = z.infer<typeof createTeenSchema>

/**
 * Schéma de mise à jour d'un profil enfant
 */
export const updateTeenSchema = createTeenSchema
  .partial()
  .extend({
    id: z.string().uuid('ID invalide'),
  })

export type UpdateTeenInput = z.infer<typeof updateTeenSchema>

/**
 * Schéma pour vérifier la disponibilité d'un pseudo
 */
export const checkPseudoSchema = z.object({
  pseudo: pseudoSchema,
  excludeTeenId: z.string().uuid('ID invalide').optional(),
})

export type CheckPseudoInput = z.infer<typeof checkPseudoSchema>

/**
 * Schéma pour récupérer un teen par ID
 */
export const getTeenByIdSchema = z.object({
  teenId: z.string().uuid('ID invalide'),
})

export type GetTeenByIdInput = z.infer<typeof getTeenByIdSchema>

/**
 * Schéma pour la suppression
 */
export const deleteTeenSchema = z.object({
  teenId: z.string().uuid('ID invalide'),
})

export type DeleteTeenInput = z.infer<typeof deleteTeenSchema>

/* ==========================================================================
   OUTPUT TYPES
   ========================================================================== */

/**
 * Type de retour standard pour les actions
 */
export type ActionResult<T = unknown> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Type Teen complet (depuis DB)
 */
export type Teen = {
  id: string
  parent_id: string
  first_name: string
  last_name: string
  pseudo: string
  avatar_url: string | null
  date_of_birth: string
  gender: Gender | null
  school: string | null
  grade_level: string | null
  profiles: TeenProfile[]
  interests: string[]
  allergies: string | null
  photo_consent: boolean
  exit_permission_rules: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
  emergency_contact_relation: string | null
  created_at: string
  updated_at: string
}
