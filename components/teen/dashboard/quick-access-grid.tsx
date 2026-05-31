'use client'

import * as React from 'react'
import Link from 'next/link'
import { Target, Users, Compass, Wallet, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotificationCounts } from '@/lib/hooks/teen-dashboard'

/* ==========================================================================
   QUICK ACCESS GRID — #205 refonte dashboard
   4 raccourcis = les 4 piliers de nav (hors Accueil). Charte paper néo-
   brutaliste : bordures franches, ombres dures, aucun tilt 3D / glow /
   shimmer / holographic (effets hors charte retirés). Les badges sont des
   compteurs RÉELS (useNotificationCounts), plus aucun NEW/HOT/LIVE en dur.
   ========================================================================== */

interface QuickAccessItem {
  label: string
  description: string
  href: string
  icon: React.ElementType
  tint: string
  notificationCount?: number
}

export function QuickAccessGrid({ userId }: { userId?: string }) {
  const notificationCounts = useNotificationCounts(userId)

  const items = React.useMemo<QuickAccessItem[]>(
    () => [
      {
        label: 'Jouer',
        description: 'Quiz, quêtes et défis',
        href: '/teen/quests',
        icon: Target,
        tint: 'bg-accent-soft/20',
        notificationCount: notificationCounts.quests,
      },
      {
        label: 'Crew',
        description: 'Ton crew et tes amis',
        href: '/teen/circles',
        icon: Users,
        tint: 'bg-gold/20',
        notificationCount: notificationCounts.social,
      },
      {
        label: 'Services',
        description: 'Sorties, transport, food…',
        href: '/teen/services',
        icon: Compass,
        tint: 'bg-success-soft/20',
      },
      {
        label: 'Wallet',
        description: 'Coins, boutique et badges',
        href: '/teen/wallet',
        icon: Wallet,
        tint: 'bg-brand-soft/20',
        notificationCount: notificationCounts.wallet,
      },
    ],
    [notificationCounts],
  )

  return (
    <div className="p-4 sm:p-6">
      <span className="eyebrow mb-4 block tracking-[0.16em] text-mute">Tes raccourcis</span>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-label={`${item.label} : ${item.description}${
              item.notificationCount ? `, ${item.notificationCount} notifications` : ''
            }`}
            className={cn(
              'group relative flex min-h-[110px] flex-col justify-between rounded-2xl border-2 border-ink bg-white p-3 shadow-stkr-sm sm:p-4',
              'transition-transform duration-150 hover:-translate-y-0.5 active:translate-y-0',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink',
            )}
          >
            <div className="flex items-start justify-between">
              <span
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-xl border-2 border-ink sm:h-11 sm:w-11',
                  item.tint,
                )}
              >
                <item.icon className="h-5 w-5 text-ink" aria-hidden />
              </span>
              {item.notificationCount && item.notificationCount > 0 ? (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full border border-ink bg-pink px-1.5 text-[10px] font-bold text-ink">
                  {item.notificationCount > 9 ? '9+' : item.notificationCount}
                </span>
              ) : null}
            </div>
            <div className="flex items-end justify-between gap-1">
              <div className="min-w-0">
                <h3 className="font-display text-sm font-extrabold tracking-tight text-ink sm:text-base">
                  {item.label}
                </h3>
                <p className="hidden truncate text-xs text-mute sm:block">{item.description}</p>
              </div>
              <ArrowRight
                className="h-4 w-4 shrink-0 text-mute transition-transform duration-150 group-hover:translate-x-0.5"
                aria-hidden
              />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
