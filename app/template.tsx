"use client"

import { PageTransitionProvider } from "@/components/providers/page-transition-provider"

export default function RootTemplate({ children }: { children: React.ReactNode }) {
  return (
    <PageTransitionProvider preset="elegant" duration={0.4} showProgress={false} enableSound={false}>
      {children}
    </PageTransitionProvider>
  )
}
