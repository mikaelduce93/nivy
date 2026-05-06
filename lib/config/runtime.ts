/**
 * Runtime Configuration System
 * 
 * Permet de charger la configuration au runtime sans rebuild.
 * Supporte Vercel Edge Config et variables d'environnement.
 * 
 * Usage:
 * ```ts
 * const config = await getRuntimeConfig()
 * const apiUrl = config.apiUrl
 * ```
 */

import 'server-only'

// Cache en mémoire (TTL: 5 minutes)
const CONFIG_CACHE = new Map<string, { value: any; expires: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Configuration runtime typée
 */
export interface RuntimeConfig {
  // URLs API
  apiUrl: string
  supabaseUrl: string
  
  // Feature flags (référence vers lib/features/flags.ts)
  featureFlags: {
    newPaymentMethod: boolean
    cmiPayment: boolean
    mobileMoneyPayment: boolean
  }
  
  // Paiements
  payments: {
    stripeEnabled: boolean
    cmiEnabled: boolean
    mobileMoneyEnabled: boolean
    xpPaymentEnabled: boolean
  }
  
  // Monitoring
  monitoring: {
    sentryEnabled: boolean
    analyticsEnabled: boolean
  }
  
  // PWA
  pwa: {
    enabled: boolean
    offlineMode: boolean
  }
  
  // Rate limiting
  rateLimiting: {
    enabled: boolean
    redisUrl?: string
  }
}

/**
 * Configuration par défaut (fallback)
 */
const DEFAULT_CONFIG: RuntimeConfig = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || '',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  
  featureFlags: {
    newPaymentMethod: false,
    cmiPayment: false,
    mobileMoneyPayment: false,
  },
  
  payments: {
    stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
    cmiEnabled: !!process.env.CMI_MERCHANT_ID,
    mobileMoneyEnabled: !!(process.env.INWI_API_KEY || process.env.ORANGE_API_KEY),
    xpPaymentEnabled: true,
  },
  
  monitoring: {
    sentryEnabled: !!process.env.SENTRY_DSN,
    analyticsEnabled: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === 'true',
  },
  
  pwa: {
    enabled: true,
    offlineMode: false,
  },
  
  rateLimiting: {
    enabled: !!process.env.UPSTASH_REDIS_REST_URL,
    redisUrl: process.env.UPSTASH_REDIS_REST_URL,
  },
}

/**
 * Récupère la configuration runtime
 * 
 * @param forceRefresh - Forcer le refresh (ignorer le cache)
 * @returns Promise<RuntimeConfig>
 */
export async function getRuntimeConfig(
  forceRefresh = false
): Promise<RuntimeConfig> {
  // Vérifier le cache
  if (!forceRefresh) {
    const cached = CONFIG_CACHE.get('runtime')
    if (cached && cached.expires > Date.now()) {
      return cached.value as RuntimeConfig
    }
  }

  let config: RuntimeConfig

  try {
    // Option 1: Vercel Edge Config (recommandé)
    if (process.env.EDGE_CONFIG) {
      try {
        const { get } = await import('@vercel/edge-config')
        
        // Récupérer toutes les valeurs depuis Edge Config
        const [
          apiUrl,
          supabaseUrl,
          newPaymentMethod,
          cmiPayment,
          mobileMoneyPayment,
          stripeEnabled,
          cmiEnabled,
          mobileMoneyEnabled,
          xpPaymentEnabled,
          sentryEnabled,
          analyticsEnabled,
          pwaEnabled,
          offlineMode,
          rateLimitingEnabled,
          redisUrl,
        ] = await Promise.all([
          get('api_url'),
          get('supabase_url'),
          get('feature_new_payment_method'),
          get('feature_cmi_payment'),
          get('feature_mobile_money_payment'),
          get('payment_stripe_enabled'),
          get('payment_cmi_enabled'),
          get('payment_mobile_money_enabled'),
          get('payment_xp_enabled'),
          get('monitoring_sentry_enabled'),
          get('monitoring_analytics_enabled'),
          get('pwa_enabled'),
          get('pwa_offline_mode'),
          get('rate_limiting_enabled'),
          get('rate_limiting_redis_url'),
        ])

        config = {
          apiUrl: (apiUrl as string) || DEFAULT_CONFIG.apiUrl,
          supabaseUrl: (supabaseUrl as string) || DEFAULT_CONFIG.supabaseUrl,
          
          featureFlags: {
            newPaymentMethod: newPaymentMethod === true || newPaymentMethod === 'true',
            cmiPayment: cmiPayment === true || cmiPayment === 'true',
            mobileMoneyPayment: mobileMoneyPayment === true || mobileMoneyPayment === 'true',
          },
          
          payments: {
            stripeEnabled: stripeEnabled === true || stripeEnabled === 'true' || DEFAULT_CONFIG.payments.stripeEnabled,
            cmiEnabled: cmiEnabled === true || cmiEnabled === 'true' || DEFAULT_CONFIG.payments.cmiEnabled,
            mobileMoneyEnabled: mobileMoneyEnabled === true || mobileMoneyEnabled === 'true' || DEFAULT_CONFIG.payments.mobileMoneyEnabled,
            xpPaymentEnabled: xpPaymentEnabled === true || xpPaymentEnabled === 'true' || DEFAULT_CONFIG.payments.xpPaymentEnabled,
          },
          
          monitoring: {
            sentryEnabled: sentryEnabled === true || sentryEnabled === 'true' || DEFAULT_CONFIG.monitoring.sentryEnabled,
            analyticsEnabled: analyticsEnabled === true || analyticsEnabled === 'true' || DEFAULT_CONFIG.monitoring.analyticsEnabled,
          },
          
          pwa: {
            enabled: pwaEnabled === true || pwaEnabled === 'true' || DEFAULT_CONFIG.pwa.enabled,
            offlineMode: offlineMode === true || offlineMode === 'true' || DEFAULT_CONFIG.pwa.offlineMode,
          },
          
          rateLimiting: {
            enabled: rateLimitingEnabled === true || rateLimitingEnabled === 'true' || DEFAULT_CONFIG.rateLimiting.enabled,
            redisUrl: (redisUrl as string) || DEFAULT_CONFIG.rateLimiting.redisUrl,
          },
        }
      } catch (error) {
        // Fallback vers env vars si Edge Config échoue
        console.warn('[Runtime Config] Edge Config failed, using env fallback:', error)
        config = getFromEnv()
      }
    } else {
      // Option 2: Variables d'environnement (fallback)
      config = getFromEnv()
    }
  } catch (error) {
    console.error('[Runtime Config] Error loading config:', error)
    config = DEFAULT_CONFIG
  }

  // Mettre en cache
  CONFIG_CACHE.set('runtime', {
    value: config,
    expires: Date.now() + CACHE_TTL,
  })

  return config
}

/**
 * Récupère la configuration depuis les variables d'environnement
 */
function getFromEnv(): RuntimeConfig {
  return {
    ...DEFAULT_CONFIG,
    // Override avec env vars si disponibles
    apiUrl: process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || DEFAULT_CONFIG.apiUrl,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_CONFIG.supabaseUrl,
    
    featureFlags: {
      newPaymentMethod: process.env.FEATURE_NEW_PAYMENT_METHOD === 'true',
      cmiPayment: process.env.FEATURE_CMI_PAYMENT === 'true',
      mobileMoneyPayment: process.env.FEATURE_MOBILE_MONEY_PAYMENT === 'true',
    },
    
    payments: {
      stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
      cmiEnabled: !!process.env.CMI_MERCHANT_ID,
      mobileMoneyEnabled: !!(process.env.INWI_API_KEY || process.env.ORANGE_API_KEY),
      xpPaymentEnabled: process.env.FEATURE_XP_PAYMENT !== 'false',
    },
    
    monitoring: {
      sentryEnabled: !!process.env.SENTRY_DSN,
      analyticsEnabled: process.env.NEXT_PUBLIC_VERCEL_ANALYTICS === 'true',
    },
    
    pwa: {
      enabled: process.env.NEXT_PUBLIC_PWA_ENABLED !== 'false',
      offlineMode: process.env.FEATURE_PWA_OFFLINE_MODE === 'true',
    },
    
    rateLimiting: {
      enabled: !!process.env.UPSTASH_REDIS_REST_URL,
      redisUrl: process.env.UPSTASH_REDIS_REST_URL,
    },
  }
}

/**
 * Invalide le cache de configuration
 */
export function invalidateConfigCache(): void {
  CONFIG_CACHE.clear()
}

/**
 * Récupère une valeur spécifique de la config
 */
export async function getConfigValue<T>(
  key: keyof RuntimeConfig | string,
  defaultValue?: T
): Promise<T | undefined> {
  const config = await getRuntimeConfig()
  
  // Support pour les clés imbriquées (ex: "payments.stripeEnabled")
  const cfg = config as unknown as Record<string, unknown>
  if (key.includes('.')) {
    const [parent, child] = key.split('.')
    const parentValue = cfg[parent] as Record<string, unknown> | undefined
    return (parentValue?.[child] as T | undefined) ?? defaultValue
  }

  return (cfg[key] as T | undefined) ?? defaultValue
}

