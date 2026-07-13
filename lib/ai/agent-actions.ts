'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getUserRole } from '@/lib/auth/get-user-role'

/**
 * Server Actions exécutables par les Agents AI
 * IMPLEMENTATION RÉELLE (Sans Mocks)
 */

// --- TEEN ACTIONS ---

export async function performCheckIn(venueName: string, xpReward: number = 50) {
  try {
    // #212 — drift corrigé : teen_id canonique = teenData.id (pas auth.uid brut),
    // et signature RPC complète (p_source_category / p_source_id) comme la voie
    // de référence app/api/teen/quests/complete.
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== 'teen' || !userInfo.teenData?.id) {
      return { success: false, message: "Non authentifié" }
    }
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('add_xp_to_user', {
      p_teen_id: userInfo.teenData.id,
      p_xp_amount: xpReward,
      p_source_type: 'check_in',
      p_source_category: 'check_in',
      p_source_id: undefined,
      p_description: `Check-in à ${venueName}`,
    })

    if (error) {
      console.error("XP Error:", error)
      return { success: false, message: "Erreur lors de l'ajout d'XP" }
    }

    revalidatePath('/teen')
    
    // Le retour de la RPC contient les infos de niveau
    const levelInfo = data as { leveled_up?: boolean; new_level?: number } | null
    const levelMsg = levelInfo?.leveled_up ? ` NIVEAU UP! (Niv ${levelInfo.new_level})` : ''
    
    return { success: true, message: `Check-in validé à ${venueName} ! +${xpReward} XP.${levelMsg}` }
  } catch (e) {
    console.error(e)
    return { success: false, message: "Erreur technique lors du check-in" }
  }
}

// --- PARENT ACTIONS ---

export async function updateBudgetLimit(category: string, _amount: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, message: "Non authentifié" }

    // Drift schéma : aucune table de plafonds par catégorie (`budget_limits` avec
    // parent_id + category + limit_amount) n'existe en base. `teen_budget_limits`
    // est un modèle différent (plafonds coins par ado, pas par catégorie MAD) et
    // ne peut pas recevoir cette écriture. Cette action n'est donc pas câblée :
    // échec honnête (#202) plutôt qu'un faux succès qui mentirait au parent.
    console.error("[agent-actions] updateBudgetLimit: pas de table de plafonds par catégorie en base (drift schéma)")
    return { success: false, message: `Impossible de mettre à jour le plafond '${category}' pour le moment.` }
  } catch (e) {
    return { success: false, message: "Erreur mise à jour budget" }
  }
}

// --- PARTNER ACTIONS ---

export async function createFlashOffer(title: string, discount: number) {
  try {
    // #212 — drift corrigé : la table canonique est `partner_offers` (pas `offers`),
    // partner_id résolu via le profil partenaire, et une offre n'est JAMAIS live à
    // la création (status='pending_approval', is_active=false → modération admin).
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== 'partner' || !userInfo.partnerData?.id) {
      return { success: false, message: "Non authentifié" }
    }
    const supabase = await createClient()
    const now = new Date()

    const { error } = await supabase.from('partner_offers').insert({
      partner_id: userInfo.partnerData.id,
      title,
      description: `Offre Flash générée par IA : -${discount}%`,
      offer_type: 'discount',
      discount_type: 'percentage',
      discount_value: discount,
      discount_pct: discount,
      valid_from: now.toISOString(),
      valid_until: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // 24h
      status: 'pending_approval',
      is_active: false,
      requires_vip: false,
      current_total_uses: 0,
      tags: [],
    })

    if (error) {
      console.error("Offer Create Error:", error)
      return { success: false, message: "Erreur lors de la création de l'offre" }
    }

    revalidatePath('/partner')
    return { success: true, message: `Offre Flash "${title}" (-${discount}%) soumise pour modération.` }
  } catch (e) {
    console.error("createFlashOffer error:", e)
    return { success: false, message: "Erreur technique création offre" }
  }
}

// --- AMBASSADOR ACTIONS ---

export async function shareReferralCode() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, message: "Non authentifié" }

    // Drift schéma corrigé : `referral_code` n'est PAS une colonne (de profiles
    // ou ailleurs). Le code canonique vient de la RPC get_or_create_referral_code
    // (renvoie un jsonb { success, code, ... }).
    const { data: referral, error: referralErr } = await supabase
      .rpc('get_or_create_referral_code', { p_user_id: user.id })

    if (referralErr) {
      console.error("[agent-actions] shareReferralCode RPC error:", referralErr)
      return { success: false, message: "Impossible de récupérer votre code pour le moment." }
    }

    const code = (referral as { code?: string } | null)?.code || "CODE-NON-DEFINI"

    // Dans un contexte serveur, on ne peut pas écrire dans le presse-papier client
    // On retourne le code pour que le client l'affiche/copie
    return { 
      success: true, 
      message: `Votre code est: ${code}`, 
      data: { code } 
    }
  } catch (e) {
    return { success: false, message: "Erreur récupération code" }
  }
}
