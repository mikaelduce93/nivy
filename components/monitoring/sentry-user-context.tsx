'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { setUserContext, setEnvironmentTag } from '@/lib/monitoring/sentry-enhanced'

/**
 * Client component to set Sentry user context after authentication
 * Should be included in pages that require authentication
 */
export function SentryUserContext() {
  useEffect(() => {
    async function updateSentryContext() {
      try {
        // Set environment tag
        setEnvironmentTag(process.env.NODE_ENV || 'development')

        // Get user from Supabase
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setUserContext(null)
          return
        }

        // Get profile to get role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, email, full_name')
          .eq('id', user.id)
          .single()

        if (profile) {
          setUserContext({
            id: user.id,
            email: profile.email || user.email || undefined,
            username: profile.full_name || undefined,
            role: profile.role || undefined,
          })
        } else {
          // Fallback to basic user info
          setUserContext({
            id: user.id,
            email: user.email || undefined,
          })
        }
      } catch (error) {
        console.error('[Sentry] Error setting user context:', error)
      }
    }

    updateSentryContext()

    // Listen for auth state changes
    try {
      const supabase = createClient()
      if (supabase && supabase.auth && typeof supabase.auth.onAuthStateChange === 'function') {
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event: string, session: { user?: { id: string } } | null) => {
          if (event === 'SIGNED_IN' && session?.user) {
            updateSentryContext()
          } else if (event === 'SIGNED_OUT') {
            setUserContext(null)
          }
        })

        return () => {
          subscription?.unsubscribe()
        }
      }
    } catch (error) {
      console.warn('[Sentry] Error setting up auth state listener:', error)
    }
  }, [])

  return null // This component doesn't render anything
}

