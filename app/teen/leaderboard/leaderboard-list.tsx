'use client'

/**
 * Wave 3 / TICKET-026 — Creator leaderboard (charte paper néo-brutaliste).
 *
 * Podium top-3 (#1 surélevé en surface sombre + Niv proud) puis reste du
 * classement en lignes sticker. Identité de lecture enrichie : pseudo + avatar
 * (joints côté serveur sur `profiles`) au lieu du hash `user_id`. La ligne du
 * joueur courant est surlignée (ombre rose + translate).
 */

import * as React from 'react'
import { Niv } from '@/components/brand'
import { StickerCard } from '@/components/ui/sticker-card'
import { cn } from '@/lib/utils'

const CATEGORY_LABELS: Record<string, string> = {
  sport: 'Sport',
  art: 'Art',
  tech: 'Tech',
  academic: 'Études',
  food: 'Food',
  lifestyle: 'Lifestyle',
}

export type LeaderboardRow = {
  user_id: string
  category: string | null
  submissions_count: number
  total_likes: number
  total_views: number
  xp_earned: number
  rank_overall: number | null
  /** Pseudo joint sur `profiles` (lecture enrichie). */
  pseudo?: string | null
  /** Avatar joint sur `profiles` (lecture enrichie). */
  avatar_url?: string | null
}

interface LeaderboardListProps {
  entries: LeaderboardRow[]
  /** Id du joueur courant — surligne sa ligne. */
  currentUserId?: string
}

/** Avatar rond bordure ink, fallback initiale du pseudo. */
function RowAvatar({ row, size = 40 }: { row: LeaderboardRow; size?: number }) {
  const name = row.pseudo?.trim() || 'Anonyme'
  if (row.avatar_url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatar_url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full border-2 border-ink object-cover"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <span
      aria-hidden="true"
      className="grid shrink-0 place-items-center rounded-full border-2 border-ink bg-paper-2 font-display font-bold text-ink"
      style={{ width: size, height: size }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  )
}

const PODIUM_TONE = ['gold', 'teal', 'coral'] as const

export function LeaderboardList({ entries, currentUserId }: LeaderboardListProps) {
  const podium = entries.slice(0, 3)
  const rest = entries.slice(3)
  const leader = podium[0]

  return (
    <div className="space-y-6">
      {/* Podium top-3 — #1 surélevé, hiérarchie 1-2-3 (pas un mur égalitaire). */}
      {leader && (
        <div className="space-y-3">
          {/* #1 — surface sombre, XP gold géant Bricolage + Niv proud. */}
          <div
            className={cn(
              'relative overflow-hidden rounded-2xl border-2 border-ink text-paper shadow-stkr-md',
              'bg-[linear-gradient(135deg,var(--night-2),var(--night))]',
              leader.user_id === currentUserId &&
                '-translate-x-0.5 -translate-y-0.5 shadow-stkr-pink',
            )}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full"
              style={{
                background:
                  'radial-gradient(circle, color-mix(in oklch, var(--gold) 45%, transparent), transparent 70%)',
              }}
            />
            <div className="relative flex items-center gap-4 p-5">
              <Niv mood="proud" size={84} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="eyebrow tracking-[0.16em] text-paper/60">
                  #1 · Créateur du mois
                </span>
                <p className="mt-1 truncate font-display text-xl font-bold text-paper">
                  {leader.pseudo?.trim() || 'Anonyme'}
                </p>
                <p className="mt-0.5 font-mono text-xs text-paper/60">
                  {leader.submissions_count} posts · ♥ {leader.total_likes}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-display text-[clamp(2rem,7vw,3rem)] font-extrabold leading-none tabular-nums text-gold">
                  {leader.xp_earned}
                </p>
                <span className="font-mono text-xs uppercase tracking-widest text-paper/60">
                  XP
                </span>
              </div>
            </div>
          </div>

          {/* #2 et #3 — cartes sticker côte à côte. */}
          {podium.length > 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              {podium.slice(1).map((row, i) => {
                const rank = i + 2
                const isMe = row.user_id === currentUserId
                return (
                  <StickerCard
                    key={row.user_id}
                    className={cn(
                      'p-4',
                      isMe &&
                        '-translate-x-0.5 -translate-y-0.5 shadow-stkr-pink',
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'shrink-0 font-display text-2xl font-extrabold tabular-nums',
                          PODIUM_TONE[rank - 1] === 'teal' ? 'text-teal' : 'text-coral',
                        )}
                      >
                        #{rank}
                      </span>
                      <RowAvatar row={row} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-bold text-ink">
                          {row.pseudo?.trim() || 'Anonyme'}
                        </p>
                        <p className="font-mono text-xs text-mute">
                          {row.submissions_count} posts · ♥ {row.total_likes}
                        </p>
                      </div>
                      <span className="shrink-0 text-right font-mono text-sm font-semibold text-gold tabular-nums">
                        {row.xp_earned} XP
                      </span>
                    </div>
                  </StickerCard>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Reste du classement — lignes sticker, rang mono, XP gold mono. */}
      {rest.length > 0 && (
        <ol className="space-y-2">
          {rest.map((row, idx) => {
            const rank = idx + 4
            const isMe = row.user_id === currentUserId
            return (
              <li key={row.user_id}>
                <StickerCard
                  variant="panel"
                  className={cn(
                    'px-4 py-3',
                    isMe &&
                      '-translate-x-0.5 -translate-y-0.5 shadow-stkr-pink',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 shrink-0 text-right font-mono text-sm font-semibold text-mute tabular-nums">
                      #{rank}
                    </span>
                    <RowAvatar row={row} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-ink">
                        {row.pseudo?.trim() || 'Anonyme'}
                        {isMe && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-pink">
                            toi
                          </span>
                        )}
                      </p>
                      <p className="font-mono text-xs text-mute">
                        {row.submissions_count} posts · ♥ {row.total_likes}
                        {row.category && CATEGORY_LABELS[row.category]
                          ? ` · ${CATEGORY_LABELS[row.category]}`
                          : ''}
                      </p>
                    </div>
                    <span className="shrink-0 font-mono text-sm font-semibold text-gold tabular-nums">
                      {row.xp_earned} XP
                    </span>
                  </div>
                </StickerCard>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
