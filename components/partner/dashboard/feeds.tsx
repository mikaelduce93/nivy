'use client'

/**
 * Partner dashboard — Active Offers + Live Transactions feeds
 * ============================================================
 *
 * Extracted from `app/partner/page.tsx` so the two large below-the-fold
 * BentoCards (Active Offers list + Realtime Transactions feed) can be
 * lazy-loaded as their own client chunks via `next/dynamic`.
 *
 * Both render purely from the props they receive — no data fetching here.
 * Skeleton fallbacks are defined alongside the lazy wrappers in
 * `app/partner/lazy-components.tsx` and intentionally mirror the
 * `min-h` of these cards so swapping does not introduce layout shift.
 */

import * as React from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Tag } from 'lucide-react'
import { Button } from '@/components/ui/button'

/* -------------------------------------------------------------------------- */
/*  Active Offers                                                              */
/* -------------------------------------------------------------------------- */

export interface PartnerActiveOffer {
  id: string
  discount_name: string
  discount_type: string | null
  discount_value: number | null
  current_total_uses: number | null
}

export interface PartnerActiveOffersFeedProps {
  offers: PartnerActiveOffer[]
  activeCount: number
}

export function PartnerActiveOffersFeed({
  offers,
  activeCount,
}: PartnerActiveOffersFeedProps) {
  return (
    <>
      <div className="p-8 pb-4 flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
          <Tag className="w-6 h-6 text-accent-soft" /> OFFRES ACTIVES
        </h3>
        <div className="px-3 py-1 rounded-full bg-accent-soft/10 text-accent-soft text-xs font-black uppercase tracking-widest">
          {activeCount} EN LIGNE
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
        {offers.length > 0 ? (
          offers.map((offer) => (
            <div
              key={offer.id}
              className="group relative p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-accent-soft/30 hover:bg-white/[0.05] transition-all duration-500 cursor-default"
            >
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <p className="font-black text-white text-lg group-hover:text-accent-soft transition-colors">
                    {offer.discount_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-zinc-500 uppercase tracking-widest">
                      {offer.discount_type === 'percentage'
                        ? `${offer.discount_value}% RÉDUCTION`
                        : `-${offer.discount_value} DH`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-white tabular-nums">
                    {offer.current_total_uses || 0}
                  </p>
                  <p className="text-xs font-bold text-zinc-600 uppercase tracking-tighter">
                    UTILISATIONS
                  </p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 font-black uppercase tracking-widest py-20">
            Aucune campagne active
          </div>
        )}
      </div>
    </>
  )
}

/* -------------------------------------------------------------------------- */
/*  Live Transactions                                                          */
/* -------------------------------------------------------------------------- */

export interface PartnerRecentTransaction {
  id: string
  used_at: string
  final_amount: number | null
  discount_amount: number | null
  profile?: { full_name?: string | null } | null
}

export interface PartnerLiveTransactionsFeedProps {
  transactions: PartnerRecentTransaction[]
}

export function PartnerLiveTransactionsFeed({
  transactions,
}: PartnerLiveTransactionsFeedProps) {
  return (
    <>
      <div className="p-8 pb-4 flex items-center justify-between">
        <h3 className="text-xl font-black tracking-tighter flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-info-soft" /> FIL EN DIRECT
        </h3>
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-white"
        >
          <Link href="/partner/transactions">
            Tout voir <ArrowRight className="h-3 w-3 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-4 custom-scrollbar">
        {transactions.length > 0 ? (
          transactions.map((tx) => {
            const customerName = tx.profile?.full_name || 'Member'
            const date = new Date(tx.used_at)
            const timeText = date.toLocaleTimeString('fr-FR', {
              hour: '2-digit',
              minute: '2-digit',
            })

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.03] border border-white/5 hover:border-info-soft/30 transition-all duration-500"
              >
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-info-soft via-brand-soft to-accent-soft flex items-center justify-center text-black font-black text-2xl shadow-xl">
                    {customerName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-black text-white text-lg tracking-tight">
                      {customerName}
                    </p>
                    <p className="text-xs font-black text-zinc-600 uppercase tracking-widest">
                      {timeText} • VALIDÉ
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-black text-white tabular-nums">
                    {tx.final_amount} <span className="text-sm">DH</span>
                  </p>
                  <div className="inline-block px-2 py-0.5 rounded-lg bg-gen-z-lime/10 text-gen-z-lime text-xs font-black uppercase tracking-tighter mt-1">
                    -{tx.discount_amount} DH
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-zinc-700 font-black uppercase tracking-widest py-20">
            En attente de transaction
          </div>
        )}
      </div>
    </>
  )
}
