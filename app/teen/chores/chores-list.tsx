'use client'

/**
 * Wave 3 / TICKET-026 — Chore list with FLIP animations.
 *
 * Lifted out of app/teen/chores/page.tsx so chore rows can flow smoothly
 * via framer-motion's `layout` prop when their order changes (e.g. as
 * statuses update / chores are added or removed). The page itself remains
 * a server component that owns the Supabase queries and the de-dupe logic.
 */

import * as React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Coins, Sparkles } from 'lucide-react'
import { TeenChoreCompleteButton } from '@/components/teen/teen-chore-complete-button'
import { FlipList, FlipItem } from '@/lib/motion/flip-list'

export interface ChoresListChore {
  id: string
  title: string
  description: string | null
  reward_dh: number
  reward_xp: number
  recurrence: string
  required_completions: number
  evidence_required: boolean
  is_active: boolean
  created_at: string
}

export interface ChoresListCompletion {
  id: string
  chore_id: string
  parent_verified: boolean | null
  rejection_reason: string | null
  paid_at: string | null
  completed_at: string
}

interface ChoresListProps {
  chores: ChoresListChore[]
  completionsByChore: Record<string, ChoresListCompletion[]>
}

export function ChoresList({ chores, completionsByChore }: ChoresListProps) {
  return (
    <FlipList as="div" className="space-y-4">
      {chores.map((c) => {
        const list = completionsByChore[c.id] ?? []
        const verified = list.filter((x) => x.parent_verified).length
        const pending = list.filter(
          (x) => !x.parent_verified && !x.rejection_reason,
        ).length
        const lastRejection = list.find((x) => x.rejection_reason)
        return (
          <FlipItem as="div" key={c.id}>
            <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white">{c.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {c.description && (
                  <p className="text-sm text-zinc-400">{c.description}</p>
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 flex items-center gap-1">
                    <Coins className="h-3 w-3" /> {c.reward_dh} DH
                  </span>
                  <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> {c.reward_xp} XP
                  </span>
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    {c.recurrence}
                  </span>
                  <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-300">
                    {verified}/{c.required_completions} validées
                  </span>
                  {pending > 0 && (
                    <span className="px-2 py-1 rounded bg-amber-500/10 text-amber-400">
                      {pending} en attente
                    </span>
                  )}
                </div>
                {lastRejection?.rejection_reason && (
                  <p className="text-xs text-red-400">
                    Dernier refus: {lastRejection.rejection_reason}
                  </p>
                )}
                <TeenChoreCompleteButton
                  choreId={c.id}
                  evidenceRequired={c.evidence_required}
                />
              </CardContent>
            </Card>
          </FlipItem>
        )
      })}
    </FlipList>
  )
}
