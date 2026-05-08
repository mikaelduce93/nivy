'use client'

/**
 * Wave 3 / TICKET-026 — Creator leaderboard with FLIP animations.
 *
 * Lifted out of app/teen/leaderboard/page.tsx so rank changes (when the
 * user navigates between category filters or rows reorder) animate via
 * framer-motion's layout / FLIP technique instead of jumping.
 */

import * as React from 'react'
import { FlipList, FlipItem } from '@/lib/motion/flip-list'

export type LeaderboardRow = {
  user_id: string
  category: string | null
  submissions_count: number
  total_likes: number
  total_views: number
  xp_earned: number
  rank_overall: number | null
}

interface LeaderboardListProps {
  entries: LeaderboardRow[]
}

export function LeaderboardList({ entries }: LeaderboardListProps) {
  return (
    <FlipList as="ol" className="space-y-2">
      {entries.map((row, idx) => (
        <FlipItem
          as="li"
          key={row.user_id}
          className="flex items-center justify-between rounded border bg-white p-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="w-6 text-right font-bold text-gray-400">
              #{idx + 1}
            </span>
            <span className="font-mono text-xs text-gray-700">
              {row.user_id.slice(0, 8)}…
            </span>
            {row.category && (
              <span className="rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                {row.category}
              </span>
            )}
          </div>
          <div className="flex gap-4 text-xs text-gray-600">
            <span>{row.submissions_count} posts</span>
            <span>♥ {row.total_likes}</span>
            <span className="font-semibold text-blue-700">{row.xp_earned} XP</span>
          </div>
        </FlipItem>
      ))}
    </FlipList>
  )
}
