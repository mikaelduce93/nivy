'use client'

/* ==========================================================================
   LAZY COMPONENTS - Code Splitting Strategy
   
   Heavy components are dynamically imported to reduce initial bundle size.
   Target: <500KB initial bundle, rest lazy loaded.
   
   Components split:
   - SocialFeed (~150KB) - Complex real-time feed
   - TeenMapWrapper (~200KB) - Map rendering
   - MarketplaceOverlay (~100KB) - Marketplace UI
   - MapPreview (~80KB) - Map preview with animations
   - AICompanion (~120KB) - AI chat interface
   - ParticleSystem (~50KB) - Canvas particle effects
   - 3D Effects (~80KB) - 3D card effects
   ========================================================================== */

import dynamic from 'next/dynamic'

/* ==========================================================================
   SKELETON COMPONENTS
   ========================================================================== */

function FeedSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3">
          <div className="w-10 h-10 rounded-full bg-white/5" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/5" />
            <div className="h-3 w-full rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  )
}

function MapSkeleton() {
  return (
    <div className="h-full w-full flex items-center justify-center bg-zinc-900/50 rounded-2xl">
      <div className="flex flex-col items-center gap-3 text-zinc-500">
        <div className="w-16 h-16 rounded-2xl bg-white/5 animate-pulse" />
        <span className="text-xs font-black uppercase tracking-widest">Loading Map...</span>
      </div>
    </div>
  )
}

function MapPreviewSkeleton() {
  return (
    <div className="h-full w-full relative overflow-hidden rounded-2xl bg-zinc-900/80">
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="w-full h-full" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />
      </div>
      
      {/* Pulse animation */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-24 h-24 rounded-full bg-gen-z-lavender/10 animate-ping" />
      </div>
      
      {/* Center marker */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 rounded-full bg-gen-z-lavender/50 border-2 border-gen-z-lavender animate-pulse" />
      </div>
    </div>
  )
}

function AICompanionSkeleton() {
  return (
    <div className="fixed bottom-20 sm:bottom-8 right-4 sm:right-8 z-50">
      <div className="w-14 h-14 rounded-full bg-gen-z-lavender/20 animate-pulse border border-gen-z-lavender/30" />
    </div>
  )
}

function MarketplaceSkeleton() {
  return (
    <div className="p-4 space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded bg-white/5" />
      <div className="grid grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 rounded-xl bg-white/5" />
        ))}
      </div>
    </div>
  )
}

/* ==========================================================================
   DYNAMIC IMPORTS - Core Dashboard Components
   ========================================================================== */

// Social Feed - Real-time activity feed
export const LazySocialFeed = dynamic(
  () => import("@/components/feed/social-feed").then(mod => ({ default: mod.SocialFeed })),
  { 
    loading: () => <FeedSkeleton />,
    ssr: false 
  }
)

// Map Wrapper - Full map with all features
export const LazyTeenMapWrapper = dynamic(
  () => import("@/components/maps/teen-map-wrapper").then(mod => ({ default: mod.TeenMapWrapper })),
  { 
    loading: () => <MapSkeleton />,
    ssr: false 
  }
)

// Marketplace Overlay - XP marketplace
export const LazyMarketplaceOverlay = dynamic(
  () => import("@/components/teen/marketplace-overlay").then(mod => ({ default: mod.MarketplaceOverlay })),
  { 
    loading: () => <MarketplaceSkeleton />,
    ssr: false 
  }
)

// Map Preview - Dashboard map card
export const LazyMapPreview = dynamic(
  () => import("./map-preview").then(mod => ({ default: mod.MapPreview })),
  { 
    loading: () => <MapPreviewSkeleton />,
    ssr: false 
  }
)

// AI Companion - Floating AI assistant
export const LazyAICompanion = dynamic(
  () => import("./ai-companion").then(mod => ({ default: mod.AICompanion })),
  { 
    loading: () => <AICompanionSkeleton />,
    ssr: false 
  }
)

/* ==========================================================================
   DYNAMIC IMPORTS - Heavy Effects (only load on desktop)
   ========================================================================== */

// Canvas Particle System - Performant particles
export const LazyParticleSystem = dynamic(
  () => import("@/components/ui/effects/particle-system-v2").then(mod => ({ default: mod.ParticleSystemV2 })),
  { ssr: false }
)

// Floating Particles - Backwards compatible
export const LazyFloatingParticles = dynamic(
  () => import("@/components/ui/effects/particle-system-v2").then(mod => ({ default: mod.FloatingParticles })),
  { ssr: false }
)

// Rising Sparks - Backwards compatible
export const LazyRisingSparks = dynamic(
  () => import("@/components/ui/effects/particle-system-v2").then(mod => ({ default: mod.RisingSparks })),
  { ssr: false }
)

// 3D Card Effects
export const Lazy3DCard = dynamic(
  () => import("@/components/ui/effects/elite-3d-card").then(mod => ({ default: mod.Elite3DCard })),
  { ssr: false }
)

// Elite Cursor Provider
export const LazyEliteCursor = dynamic(
  () => import("@/components/ui/effects/elite-cursor").then(mod => ({ default: mod.EliteCursorProvider })),
  { ssr: false }
)

/* ==========================================================================
   SKELETON EXPORTS - For use in other components
   ========================================================================== */

export {
  FeedSkeleton,
  MapSkeleton,
  MapPreviewSkeleton,
  AICompanionSkeleton,
  MarketplaceSkeleton,
}
