'use client'

// Domain-specific lazy components for teen dashboard.
// For shared utilities see `@/lib/client/lazy-components`.

import dynamic from 'next/dynamic'

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

export const LazySocialFeed = dynamic(
  () => import("@/components/feed/social-feed").then(mod => ({ default: mod.SocialFeed })),
  {
    loading: () => <FeedSkeleton />,
    ssr: false,
  }
)

export const LazyMarketplaceOverlay = dynamic(
  () => import("@/components/teen/marketplace-overlay").then(mod => ({ default: mod.MarketplaceOverlay })),
  {
    loading: () => <MarketplaceSkeleton />,
    ssr: false,
  }
)
