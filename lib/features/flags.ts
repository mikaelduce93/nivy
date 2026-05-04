/**
 * Feature Flags System
 * 
 * Permet de gérer les feature flags avec rollback facile et déploiements progressifs.
 * 
 * Support:
 * - Vercel Edge Config (recommandé pour production)
 * - Variables d'environnement (fallback)
 * - Cache en mémoire pour performance
 * 
 * Usage:
 * ```ts
 * // Server Component / API Route
 * const enabled = await getFeatureFlag('new_payment_method')
 * 
 * // Client Component
 * const enabled = useFeatureFlag('new_payment_method')
 * ```
 */

import 'server-only'

// Cache en mémoire (TTL: 60 secondes)
const FLAG_CACHE = new Map<string, { value: boolean; expires: number }>()
const CACHE_TTL = 60 * 1000 // 60 secondes

/**
 * Types de feature flags disponibles
 */
export type FeatureFlag =
  | 'new_payment_method' // Nouveau système de paiement
  | 'cmi_payment' // Paiement CMI
  | 'mobile_money_payment' // Paiement Mobile Money
  | 'xp_payment' // Paiement avec XP
  | 'hybrid_payment' // Paiement hybride (XP + DH)
  | 'subscription_premium' // Abonnements premium
  | 'gamification_v2' // Nouvelle version gamification
  | 'ready_player_me' // Intégration Ready Player Me
  | 'ai_content_generation' // Génération de contenu IA
  | 'staging_validation' // Validation staging automatique
  | 'enhanced_monitoring' // Monitoring avancé
  | 'pwa_offline_mode' // Mode offline PWA

/**
 * Configuration par défaut des flags (fallback si Edge Config indisponible)
 */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  new_payment_method: false,
  cmi_payment: false,
  mobile_money_payment: false,
  xp_payment: true, // Activé par défaut
  hybrid_payment: false,
  subscription_premium: true, // Activé par défaut
  gamification_v2: true, // Activé par défaut
  ready_player_me: false,
  ai_content_generation: false,
  staging_validation: false,
  enhanced_monitoring: true, // Activé par défaut
  pwa_offline_mode: false,
}

/**
 * Récupère un feature flag depuis Vercel Edge Config ou variables d'environnement
 * 
 * @param flag - Nom du feature flag
 * @param defaultValue - Valeur par défaut si non trouvé (optionnel)
 * @returns Promise<boolean>
 */
export async function getFeatureFlag(
  flag: FeatureFlag,
  defaultValue?: boolean
): Promise<boolean> {
  // Vérifier le cache
  const cached = FLAG_CACHE.get(flag)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }

  let value: boolean

  try {
    // Option 1: Vercel Edge Config (recommandé)
    if (process.env.EDGE_CONFIG) {
      try {
        const { get } = await import('@vercel/edge-config')
        const edgeValue = await get(`feature_${flag}`)
        if (typeof edgeValue === 'boolean') {
          value = edgeValue
        } else if (typeof edgeValue === 'string') {
          value = edgeValue === 'true' || edgeValue === '1'
        } else {
          throw new Error('Invalid edge config value')
        }
      } catch (error) {
        // Fallback vers env vars si Edge Config échoue
        console.warn(`[Feature Flags] Edge Config failed for ${flag}, using env fallback:`, error)
        value = getFromEnv(flag, defaultValue)
      }
    } else {
      // Option 2: Variables d'environnement (fallback)
      value = getFromEnv(flag, defaultValue)
    }
  } catch (error) {
    console.error(`[Feature Flags] Error getting flag ${flag}:`, error)
    // En cas d'erreur, utiliser la valeur par défaut
    value = defaultValue ?? DEFAULT_FLAGS[flag] ?? false
  }

  // Mettre en cache
  FLAG_CACHE.set(flag, {
    value,
    expires: Date.now() + CACHE_TTL,
  })

  return value
}

/**
 * Récupère un feature flag depuis les variables d'environnement
 */
function getFromEnv(flag: FeatureFlag, defaultValue?: boolean): boolean {
  // Format: FEATURE_NEW_PAYMENT_METHOD=true
  const envKey = `FEATURE_${flag.toUpperCase().replace(/-/g, '_')}`
  const envValue = process.env[envKey]

  if (envValue !== undefined) {
    return envValue === 'true' || envValue === '1'
  }

  // Fallback vers la valeur par défaut
  return defaultValue ?? DEFAULT_FLAGS[flag] ?? false
}

/**
 * Récupère plusieurs feature flags en une seule fois
 * 
 * @param flags - Array de noms de feature flags
 * @returns Promise<Record<string, boolean>>
 */
export async function getFeatureFlags(
  flags: FeatureFlag[]
): Promise<Record<FeatureFlag, boolean>> {
  const results = await Promise.all(
    flags.map(async (flag) => [flag, await getFeatureFlag(flag)] as const)
  )

  return Object.fromEntries(results) as Record<FeatureFlag, boolean>
}

/**
 * Invalide le cache d'un feature flag (utile après mise à jour)
 */
export function invalidateFeatureFlagCache(flag?: FeatureFlag): void {
  if (flag) {
    FLAG_CACHE.delete(flag)
  } else {
    FLAG_CACHE.clear()
  }
}

/**
 * Vérifie si un feature flag est activé (synchrone, utilise le cache uniquement)
 * ⚠️ Utiliser uniquement si le flag a déjà été chargé
 */
export function isFeatureFlagEnabled(flag: FeatureFlag): boolean {
  const cached = FLAG_CACHE.get(flag)
  if (cached && cached.expires > Date.now()) {
    return cached.value
  }
  // Si pas en cache, retourner la valeur par défaut
  return DEFAULT_FLAGS[flag] ?? false
}

