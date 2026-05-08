'use client'

/**
 * Partner dashboard — page-level lazy wrappers (TICKET-034 / TICKET-035)
 * =======================================================================
 *
 * The partner home dashboard (`app/partner/page.tsx`) is a Server Component.
 * Two heavy below-the-fold blocks are extracted here so they can:
 *   - ship as separate client chunks (`next/dynamic({ ssr: false })`)
 *   - render skeleton placeholders sized to the real layout (no CLS)
 *   - be Suspense-streamed by the parent server page
 *
 * Above-the-fold (hero, first KPI strip) stays as pure RSC and is sent to
 * the browser in the initial HTML payload.
 */

import dynamic from 'next/dynamic'
import * as React from 'react'
import { SkeletonCard } from '@/components/ui/skeletons/presets'

import type {
  PartnerActiveOffersFeedProps,
  PartnerLiveTransactionsFeedProps,
} from '@/components/partner/dashboard/feeds'

/* -------------------------------------------------------------------------- */
/*  ActiveOffersFeed — list of partner discounts                              */
/* -------------------------------------------------------------------------- */

function ActiveOffersFeedSkeleton() {
  return (
    <SkeletonCard
      noImage
      lines={5}
      className="min-h-[440px] border-white/5 bg-zinc-900/40"
    />
  )
}

export const LazyPartnerActiveOffersFeed = dynamic<PartnerActiveOffersFeedProps>(
  () =>
    import('@/components/partner/dashboard/feeds').then((mod) => ({
      default: mod.PartnerActiveOffersFeed,
    })),
  {
    loading: () => <ActiveOffersFeedSkeleton />,
    ssr: false,
  },
)

/* -------------------------------------------------------------------------- */
/*  LiveTransactionsFeed — recent discount usages                             */
/* -------------------------------------------------------------------------- */

function LiveTransactionsFeedSkeleton() {
  return (
    <SkeletonCard
      noImage
      lines={5}
      className="min-h-[440px] border-white/5 bg-zinc-900/40"
    />
  )
}

export const LazyPartnerLiveTransactionsFeed =
  dynamic<PartnerLiveTransactionsFeedProps>(
    () =>
      import('@/components/partner/dashboard/feeds').then((mod) => ({
        default: mod.PartnerLiveTransactionsFeed,
      })),
    {
      loading: () => <LiveTransactionsFeedSkeleton />,
      ssr: false,
    },
  )
