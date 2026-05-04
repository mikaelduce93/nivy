'use client'

import * as React from 'react'
import { EliteCursorProvider } from '@/components/ui/effects/elite-cursor'

/* ==========================================================================
   ELITE PROVIDERS - Wraps app with premium features
   ========================================================================== */

interface EliteProvidersProps {
  children: React.ReactNode
  /** Enable elite cursor */
  cursor?: boolean
  cursorConfig?: {
    trails?: boolean
    spotlight?: boolean
    glow?: boolean
  }
}

export function EliteProviders({
  children,
  cursor = true,
  cursorConfig = {
    trails: true,
    spotlight: true,
    glow: true,
  },
}: EliteProvidersProps) {
  return (
    <EliteCursorProvider
      enabled={cursor}
      trails={cursorConfig.trails}
      spotlight={cursorConfig.spotlight}
      glow={cursorConfig.glow}
      spotlightSize={500}
      spotlightColor="rgba(139, 92, 246, 0.06)"
      glowColor="rgba(139, 92, 246, 0.3)"
      cursorColor="#8b5cf6"
    >
      {children}
    </EliteCursorProvider>
  )
}
