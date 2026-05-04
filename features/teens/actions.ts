'use server'

/**
 * TEENS PARTY MOROCCO - Teen Domain Actions
 * =========================================
 *
 * Server Actions pour la gestion des profils enfants.
 * Toutes les entrées sont validées avec Zod.
 */

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  createTeenSchema,
  updateTeenSchema,
  checkPseudoSchema,
  getTeenByIdSchema,
  deleteTeenSchema,
  type CreateTeenInput,
  type UpdateTeenInput,
  type ActionResult,
  type Teen,
} from './schema'

/* ==========================================================================
   HELPER: Get authenticated user
   ========================================================================== */

async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return { supabase, user }
}

/* ==========================================================================
   RÉFÉRENTIELS
   ========================================================================== */

/**
 * Récupère la liste des écoles disponibles
 */
export async function getSchools(): Promise<ActionResult<any[]>> {
  try {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('is_active', true)
      .order('name')

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[teens/getSchools] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère la liste des centres d'intérêt
 */
export async function getInterests(): Promise<ActionResult<any[]>> {
  try {
    const { supabase } = await getAuthenticatedUser()

    const { data, error } = await supabase
      .from('interests')
      .select('*')
      .eq('is_active', true)
      .order('category, name')

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[teens/getInterests] Error:', error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   CRUD - PROFILS ENFANTS
   ========================================================================== */

/**
 * Récupère tous les enfants du parent connecté
 */
export async function getMyTeens(): Promise<ActionResult<Teen[]>> {
  try {
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('teens')
      .select('*')
      .eq('parent_id', user.id)
      .order('created_at', { ascending: true })

    if (error) throw error

    return { success: true, data: data ?? [] }
  } catch (error: any) {
    console.error('[teens/getMyTeens] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Récupère un enfant par son ID
 */
export async function getTeenById(teenId: string): Promise<ActionResult<Teen>> {
  try {
    // Validate input
    const validation = getTeenByIdSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { data, error } = await supabase
      .from('teens')
      .select('*')
      .eq('id', teenId)
      .eq('parent_id', user.id)
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error: any) {
    console.error('[teens/getTeenById] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Vérifie si un pseudo est disponible
 */
export async function checkPseudoAvailable(
  pseudo: string,
  excludeTeenId?: string
): Promise<ActionResult<{ available: boolean }>> {
  try {
    // Validate input
    const validation = checkPseudoSchema.safeParse({ pseudo, excludeTeenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase } = await getAuthenticatedUser()

    let query = supabase
      .from('teens')
      .select('id')
      .eq('pseudo', pseudo)

    if (excludeTeenId) {
      query = query.neq('id', excludeTeenId)
    }

    const { data, error } = await query.maybeSingle()

    if (error && error.code !== 'PGRST116') throw error

    return { success: true, data: { available: !data } }
  } catch (error: any) {
    console.error('[teens/checkPseudoAvailable] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Crée un nouveau profil enfant
 */
export async function createTeen(input: CreateTeenInput): Promise<ActionResult<Teen>> {
  try {
    // Validate input with Zod
    const validation = createTeenSchema.safeParse(input)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errors }
    }

    const validatedInput = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Check pseudo availability
    const pseudoCheck = await checkPseudoAvailable(validatedInput.pseudo)
    if (!pseudoCheck.success || !pseudoCheck.data.available) {
      return { success: false, error: 'Ce pseudo est déjà utilisé' }
    }

    // Insert teen
    const { data, error } = await supabase
      .from('teens')
      .insert({
        parent_id: user.id,
        first_name: validatedInput.first_name,
        last_name: validatedInput.last_name,
        pseudo: validatedInput.pseudo,
        avatar_url: validatedInput.avatar_url,
        date_of_birth: validatedInput.date_of_birth,
        gender: validatedInput.gender,
        school: validatedInput.school,
        grade_level: validatedInput.grade_level,
        profiles: validatedInput.profiles,
        interests: validatedInput.interests,
        allergies: validatedInput.allergies,
        photo_consent: validatedInput.photo_consent,
        exit_permission_rules: validatedInput.exit_permission_rules,
        emergency_contact_name: validatedInput.emergency_contact_name,
        emergency_contact_phone: validatedInput.emergency_contact_phone,
        emergency_contact_relation: validatedInput.emergency_contact_relation,
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/profile/enfants')
    return { success: true, data }
  } catch (error: any) {
    console.error('[teens/createTeen] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Met à jour un profil enfant
 */
export async function updateTeen(input: UpdateTeenInput): Promise<ActionResult<Teen>> {
  try {
    // Validate input with Zod
    const validation = updateTeenSchema.safeParse(input)
    if (!validation.success) {
      const errors = validation.error.errors.map(e => e.message).join(', ')
      return { success: false, error: errors }
    }

    const { id, ...updateData } = validation.data
    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Check pseudo availability if changed
    if (updateData.pseudo) {
      const pseudoCheck = await checkPseudoAvailable(updateData.pseudo, id)
      if (!pseudoCheck.success || !pseudoCheck.data.available) {
        return { success: false, error: 'Ce pseudo est déjà utilisé' }
      }
    }

    // Update teen
    const { data, error } = await supabase
      .from('teens')
      .update(updateData)
      .eq('id', id)
      .eq('parent_id', user.id)
      .select()
      .single()

    if (error) throw error

    revalidatePath('/profile/enfants')
    revalidatePath(`/profile/enfants/${id}`)
    return { success: true, data }
  } catch (error: any) {
    console.error('[teens/updateTeen] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Supprime un profil enfant
 */
export async function deleteTeen(teenId: string): Promise<ActionResult<null>> {
  try {
    // Validate input
    const validation = deleteTeenSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const { error } = await supabase
      .from('teens')
      .delete()
      .eq('id', teenId)
      .eq('parent_id', user.id)

    if (error) throw error

    revalidatePath('/profile/enfants')
    return { success: true, data: null }
  } catch (error: any) {
    console.error('[teens/deleteTeen] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Upload avatar pour un enfant
 */
export async function uploadTeenAvatar(
  file: File,
  teenId: string
): Promise<ActionResult<{ url: string }>> {
  try {
    // Validate teenId
    const validation = deleteTeenSchema.safeParse({ teenId })
    if (!validation.success) {
      return { success: false, error: validation.error.errors[0].message }
    }

    const { supabase, user } = await getAuthenticatedUser()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Generate unique filename
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${teenId}-${Date.now()}.${fileExt}`

    // Upload to avatars bucket
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    // Update teen profile
    const { error: updateError } = await supabase
      .from('teens')
      .update({ avatar_url: publicUrl })
      .eq('id', teenId)
      .eq('parent_id', user.id)

    if (updateError) throw updateError

    revalidatePath('/profile/enfants')
    return { success: true, data: { url: publicUrl } }
  } catch (error: any) {
    console.error('[teens/uploadTeenAvatar] Error:', error)
    return { success: false, error: error.message }
  }
}
