/**
 * React Hook pour utiliser les feature flags côté client
 * 
 * Usage:
 * ```tsx
 * 'use client'
 * import { useFeatureFlag } from '@/lib/features/use-feature-flag'
 * 
 * export function MyComponent() {
 *   const enabled = useFeatureFlag('new_payment_method')
 *   
 *   if (!enabled) return null
 *   
 *   return <div>New Feature</div>
 * }
 * ```
 */

'use client'

import { useEffect, useState } from 'react'
import type { FeatureFlag } from './flags'

/**
 * Hook React pour récupérer un feature flag côté client
 * 
 * @param flag - Nom du feature flag
 * @param defaultValue - Valeur par défaut (optionnel)
 * @returns boolean
 */
export function useFeatureFlag(
  flag: FeatureFlag,
  defaultValue = false
): boolean {
  const [enabled, setEnabled] = useState(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFlag() {
      try {
        // Appel API pour récupérer le flag
        const response = await fetch(`/api/features/flags?flag=${flag}`)
        if (response.ok) {
          const data = await response.json()
          setEnabled(data.enabled ?? defaultValue)
        } else {
          setEnabled(defaultValue)
        }
      } catch (error) {
        console.error(`[Feature Flags] Error fetching ${flag}:`, error)
        setEnabled(defaultValue)
      } finally {
        setLoading(false)
      }
    }

    fetchFlag()
  }, [flag, defaultValue])

  return enabled
}

/**
 * Hook pour récupérer plusieurs feature flags
 */
export function useFeatureFlags(
  flags: FeatureFlag[]
): Record<FeatureFlag, boolean> {
  const [featureFlags, setFeatureFlags] = useState<Record<FeatureFlag, boolean>>(
    {} as Record<FeatureFlag, boolean>
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFlags() {
      try {
        const response = await fetch(
          `/api/features/flags?flags=${flags.join(',')}`
        )
        if (response.ok) {
          const data = await response.json()
          setFeatureFlags(data.flags ?? {})
        }
      } catch (error) {
        console.error('[Feature Flags] Error fetching flags:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFlags()
  }, [flags.join(',')])

  return featureFlags
}

