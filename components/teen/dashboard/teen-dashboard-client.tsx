"use client"

import { useState, useEffect, ReactNode, createContext, useContext } from "react"

interface DashboardContext {
  isMobile: boolean
  prefersReducedMotion: boolean
}

interface TeenDashboardClientProps {
  children: (context: DashboardContext) => ReactNode
}

const DashboardContext = createContext<DashboardContext>({
  isMobile: false,
  prefersReducedMotion: false,
})

export function useDashboardContext() {
  return useContext(DashboardContext)
}

export function TeenDashboardClient({ children }: TeenDashboardClientProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Check mobile breakpoint (768px = md breakpoint)
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    // Check reduced motion preference
    const checkReducedMotion = () => {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
      setPrefersReducedMotion(mediaQuery.matches)
    }
    
    // Initial checks
    checkMobile()
    checkReducedMotion()
    
    // Listen for resize
    window.addEventListener("resize", checkMobile)
    
    // Listen for reduced motion changes
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)")
    mediaQuery.addEventListener("change", checkReducedMotion)
    
    return () => {
      window.removeEventListener("resize", checkMobile)
      mediaQuery.removeEventListener("change", checkReducedMotion)
    }
  }, [])

  // SSR: render with desktop defaults, then hydrate
  if (!mounted) {
    const context = { isMobile: false, prefersReducedMotion: false }
    return (
      <DashboardContext.Provider value={context}>
        {children(context)}
      </DashboardContext.Provider>
    )
  }

  const context = { isMobile, prefersReducedMotion }

  return (
    <DashboardContext.Provider value={context}>
      {children(context)}
    </DashboardContext.Provider>
  )
}
