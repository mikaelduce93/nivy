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
      p_source_id: null,
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

export async function updateBudgetLimit(category: string, amount: number) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return { success: false, message: "Non authentifié" }

    // On suppose une table 'parent_controls' ou 'budget_limits'
    // Si elle n'existe pas, on va la créer ou utiliser une table générique 'user_settings'
    
    // Pour cet exemple, on va upsert dans une table 'budget_limits' hypothétique
    // Si la table n'existe pas, l'appel échouera mais c'est le but: "Vraie Logique"
    
    const { error } = await supabase
      .from('budget_limits')
      .upsert({ 
        parent_id: user.id,
        category: category.toLowerCase(),
        limit_amount: amount,
        updated_at: new Date().toISOString()
      }, { onConflict: 'parent_id, category' })

    if (error) {
      // #202 — échec honnête : on ne renvoie plus un faux succès « Simulé » qui
      // ment au parent. Si l'écriture échoue, on le dit.
      console.error("[agent-actions] updateBudgetLimit failed:", error)
      return { success: false, message: `Impossible de mettre à jour le plafond '${category}' pour le moment.` }
    }

    revalidatePath('/parent')
    return { success: true, message: `Plafond '${category}' mis à jour à ${amount} MAD.` }
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

    // Récupérer le code réel
    const { data: profile } = await supabase
      .from('profiles')
      .select('referral_code')
      .eq('id', user.id)
      .single()

    const code = profile?.referral_code || "CODE-NON-DEFINI"
    
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
