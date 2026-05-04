'use client'

import { PageTransitionProvider } from '@/components/providers/page-transition-provider'

/* ==========================================================================
   TEEN ROUTE TEMPLATE - Cinematic Page Transitions
   
   This template wraps all pages under /teen with smooth page transitions
   ========================================================================== */

export default function TeenTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <PageTransitionProvider
      preset="elegant"
      duration={0.5}
      showProgress={true}
      enableSound={true}
    >
      {children}
    </PageTransitionProvider>
  )
}
