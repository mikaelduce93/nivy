"use client"

/**
 * Client surface for /teen/quests/friend-defis (TICKET-020 / Wave-2 FD2).
 *
 * - Re-renders the same five-tab HubTabs row used on /teen/quests so the
 *   "Défis amis" tab stays visually selected. Tabs other than "friends"
 *   route back to /teen/quests via router.push.
 *
 * - A second filter row (pending / active / completed) buckets the rows
 *   purely client-side; the server already restricts to the current user's
 *   challenges.
 *
 * - Cards use <DefiCard variant="friend">. We DO NOT modify that
 *   component (write-scope). All in-card actions are wrapped around the
 *   card via secondary buttons.
 *
 * - Mutations call FD1's API routes (TICKET-019). FD1 lands separately;
 *   if a route 404s before FD1 ships, we show the API error inline.
 */

import { useEffect, useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Brain,
  Dumbbell,
  Palette,
  Zap,
  Users,
  Swords,
  Plus,
  Check,
  X,
  TrendingUp,
  Clock,
  Trophy,
  AlertCircle,
} from "lucide-react"
import { HubTabs, type HubTab } from "@/components/teen/hub-tabs"
import { DefiCard, type DefiStatus } from "@/components/teen/defi-card"
import { Button } from "@/components/ui/button"
import { EmptyState as SharedEmptyState } from "@/components/ui/states/empty-state"
import { cn } from "@/lib/utils"

// =============================================================================
// Types
// =============================================================================

export interface FriendChallengeRow {
  id: string
  name: string | null
  creator_id: string
  opponent_id: string | null
  status: "pending" | "active" | "completed" | "cancelled" | "expired"
  acceptance_status: "pending" | "accepted" | "declined" | "expired" | null
  challenge_kind:
    | "quiz_battle"
    | "mission_race"
    | "physical_count"
    | "streak_race"
    | "xp_duel"
    | "custom"
    | null
  target_value: number | null
  progress_creator: number
  progress_opponent: number
  stake_xp: number | null
  xp_pot: number | null
  starts_at: string
  ends_at: string
  expires_at: string | null
  winner_id: string | null
  is_draw: boolean | null
  created_at: string
}

interface FriendDefisClientProps {
  teenAuthId: string
  challenges: FriendChallengeRow[]
}

type StatusFilter = "pending" | "active" | "completed"

// Same five tabs as quests-hub-client.tsx so the row stays consistent
// when the user toggles back and forth.
const QUEST_TABS: HubTab[] = [
  { id: "daily", label: "Daily", icon: Zap },
  { id: "brain", label: "Brain", icon: Brain },
  { id: "body", label: "Body", icon: Dumbbell },
  { id: "creative", label: "Creative", icon: Palette },
  { id: "friends", label: "Défis amis", icon: Users },
]

const STATUS_FILTERS: { id: StatusFilter; label: string; icon: typeof Clock }[] = [
  { id: "pending", label: "Invitations", icon: AlertCircle },
  { id: "active", label: "En cours", icon: TrendingUp },
  { id: "completed", label: "Terminés", icon: Trophy },
]

// =============================================================================
// Component
// =============================================================================

export function FriendDefisClient({ teenAuthId, challenges }: FriendDefisClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  // The HubTabs row is shared; tabs other than "friends" route back to the
  // main quests hub so the user can move between pillars without leaving
  // this branch of the tree.
  const currentTab = searchParams.get("tab") || "friends"

  useEffect(() => {
    if (currentTab && currentTab !== "friends") {
      router.push(`/teen/quests?tab=${currentTab}`)
    }
  }, [currentTab, router])

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Optimistic local removal of rows we just answered (FD1 will return the
  // canonical state on a future page refresh).
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set())

  // Bucket rows by gameplay status. Pending invitations live in their own
  // bucket so the user can answer them; active = accepted-and-running;
  // completed = settled (status='completed' OR is_draw OR winner_id set).
  const buckets = useMemo(() => {
    const pending: FriendChallengeRow[] = []
    const active: FriendChallengeRow[] = []
    const completed: FriendChallengeRow[] = []

    for (const c of challenges) {
      if (removedIds.has(c.id)) continue

      if (c.status === "completed" || c.status === "expired" || c.status === "cancelled") {
        completed.push(c)
        continue
      }

      // v2 invitation lifecycle: row sits at status=pending+acceptance_status=pending
      // until the opponent answers. FD1 then flips to status=active.
      if (c.acceptance_status === "pending" && c.status !== "active") {
        pending.push(c)
        continue
      }

      active.push(c)
    }

    return { pending, active, completed }
  }, [challenges, removedIds])

  const visible = buckets[statusFilter]

  // Counts feed the filter chip badges so the user sees pending invites
  // at a glance without flipping filters.
  const counts = {
    pending: buckets.pending.length,
    active: buckets.active.length,
    completed: buckets.completed.length,
  }

  // ---------------------------------------------------------------------------
  // Mutation helpers — call FD1's API routes (TICKET-019).
  // ---------------------------------------------------------------------------
  async function handleAccept(id: string) {
    setActionError(null)
    setPendingActionId(id)
    try {
      const res = await fetch(`/api/teen/friend-challenges/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept" }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `HTTP ${res.status}`)
      }
      // Invitation answered → remove from pending bucket; the server
      // refresh on next visit will surface it under "active".
      setRemovedIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur d'acceptation")
    } finally {
      setPendingActionId(null)
    }
  }

  async function handleDecline(id: string) {
    setActionError(null)
    setPendingActionId(id)
    try {
      // FD1's accept route accepts a body { action: "decline" } per
      // TICKETS.md TICKET-019. If FD1 ends up exposing a separate
      // /decline route this can be retargeted without touching state.
      const res = await fetch(`/api/teen/friend-challenges/${id}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decline" }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `HTTP ${res.status}`)
      }
      setRemovedIds((prev) => {
        const next = new Set(prev)
        next.add(id)
        return next
      })
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur de refus")
    } finally {
      setPendingActionId(null)
    }
  }

  async function handleRecordProgress(id: string) {
    setActionError(null)
    setPendingActionId(id)
    try {
      // FD1's progress endpoint expects { delta: number } per TICKET-019
      // acceptance criteria. Increment by 1 — challenge_kind-specific
      // capture (mission completion, quiz answer, etc.) lives in FD1.
      const res = await fetch(`/api/teen/friend-challenges/${id}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta: 1 }),
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(body || `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Erreur de progression")
    } finally {
      setPendingActionId(null)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br from-pink-500 via-rose-400 to-fuchsia-400">
              <Users className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">
                Défis amis
              </h1>
              <p className="text-zinc-500 text-sm font-medium">
                Affronte ton crew, mise des XP, prends la couronne
              </p>
            </div>
          </div>

          <Button
            onClick={() => router.push("/teen/quests/friend-defis/new")}
            className="bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black uppercase tracking-wider"
          >
            <Plus className="w-4 h-4 mr-2" />
            Lancer un défi
          </Button>
        </div>

        {/* Hub tabs (shared with /teen/quests) */}
        <HubTabs tabs={QUEST_TABS} defaultTab="friends" />

        {/* Status filter chips */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const Icon = f.icon
            const isActive = statusFilter === f.id
            const count = counts[f.id]
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all",
                  "ring-1",
                  isActive
                    ? "bg-pink-500/20 text-pink-200 ring-pink-400/40"
                    : "bg-white/5 text-zinc-400 ring-white/10 hover:text-zinc-200 hover:bg-white/10",
                )}
                aria-pressed={isActive}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {f.label}
                <span
                  className={cn(
                    "ml-1 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[10px]",
                    isActive ? "bg-pink-400/30 text-pink-100" : "bg-white/10 text-zinc-300",
                  )}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Inline error surface */}
        {actionError ? (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            <strong className="font-black">Erreur : </strong>
            {actionError}
          </div>
        ) : null}
      </header>

      {/* Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={statusFilter}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.25 }}
        >
          {visible.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {visible.map((c, idx) => (
                <FriendDefiTile
                  key={c.id}
                  row={c}
                  teenAuthId={teenAuthId}
                  filter={statusFilter}
                  busy={pendingActionId === c.id}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onRecordProgress={handleRecordProgress}
                  index={idx}
                />
              ))}
            </div>
          ) : (
            <FriendDefisEmptyState filter={statusFilter} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Per-row tile — wraps DefiCard with action affordances.
// =============================================================================

interface FriendDefiTileProps {
  row: FriendChallengeRow
  teenAuthId: string
  filter: StatusFilter
  busy: boolean
  onAccept: (id: string) => void
  onDecline: (id: string) => void
  onRecordProgress: (id: string) => void
  index: number
}

function FriendDefiTile({
  row,
  teenAuthId,
  filter,
  busy,
  onAccept,
  onDecline,
  onRecordProgress,
  index,
}: FriendDefiTileProps) {
  const isOpponent = row.opponent_id === teenAuthId
  const isCreator = row.creator_id === teenAuthId

  // DefiCard uses 'active' | 'completed' | 'expired' | 'locked'. Map our
  // gameplay status onto its visual states.
  const cardStatus: DefiStatus = (() => {
    if (row.status === "completed") return "completed"
    if (row.status === "expired" || row.status === "cancelled") return "expired"
    return "active"
  })()

  // Per-side score → progress bar. We pick the *current user's* score so
  // the bar feels personal; the v2 schema also stores the opponent's score
  // and FD4 uses both at resolve-time.
  const myScore = isCreator ? row.progress_creator : row.progress_opponent
  const target = row.target_value && row.target_value > 0 ? row.target_value : null

  // Days-left chip uses ends_at for active rows, expires_at for pending
  // invites (so the opponent sees the invitation expiry, which is what
  // matters for "decide before this disappears").
  const refDate = filter === "pending" && row.expires_at ? row.expires_at : row.ends_at
  const daysLeft = computeDaysLeft(refDate)

  // Pot precedence: v2 xp_pot (sum of stakes) → v1 stake_xp → 0. Display
  // the pot as the XP reward chip on the card so the stake stays visible.
  const xpReward = row.xp_pot && row.xp_pot > 0 ? row.xp_pot : row.stake_xp || 0

  const title = row.name || friendlyKindLabel(row.challenge_kind) || "Défi entre amis"
  const description = describeChallenge(row, isCreator)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="space-y-3"
    >
      <DefiCard
        type="friend"
        title={title}
        description={description}
        xpReward={xpReward}
        status={cardStatus}
        progress={
          target ? { current: Math.max(0, myScore), target } : undefined
        }
        daysLeft={daysLeft ?? undefined}
      />

      {/* Action row — accept/decline for incoming pending invites,
          record-progress for active. Creator-on-pending sees a passive
          "En attente de réponse" line since they can't accept their own
          invitation. */}
      <div className="flex items-center gap-2 px-1">
        {filter === "pending" && isOpponent ? (
          <>
            <Button
              onClick={() => onAccept(row.id)}
              disabled={busy}
              size="sm"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-black font-black uppercase tracking-wider"
            >
              <Check className="w-4 h-4 mr-1" />
              Accepter
            </Button>
            <Button
              onClick={() => onDecline(row.id)}
              disabled={busy}
              size="sm"
              variant="outline"
              className="flex-1 border-red-500/40 text-red-200 hover:bg-red-500/10 font-black uppercase tracking-wider"
            >
              <X className="w-4 h-4 mr-1" />
              Refuser
            </Button>
          </>
        ) : null}

        {filter === "pending" && isCreator ? (
          <p className="text-xs text-zinc-500 italic">
            En attente de réponse de l'adversaire…
          </p>
        ) : null}

        {filter === "active" ? (
          <Button
            onClick={() => onRecordProgress(row.id)}
            disabled={busy}
            size="sm"
            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-black uppercase tracking-wider"
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            +1 progression
          </Button>
        ) : null}

        {filter === "completed" ? (
          <CompletedSummary row={row} teenAuthId={teenAuthId} />
        ) : null}
      </div>
    </motion.div>
  )
}

function CompletedSummary({
  row,
  teenAuthId,
}: {
  row: FriendChallengeRow
  teenAuthId: string
}) {
  if (row.is_draw) {
    return (
      <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
        Match nul — pot partagé
      </p>
    )
  }
  if (!row.winner_id) {
    return (
      <p className="text-xs italic text-zinc-500">
        Résolution en attente…
      </p>
    )
  }
  const won = row.winner_id === teenAuthId
  return (
    <p
      className={cn(
        "text-xs font-black uppercase tracking-wider",
        won ? "text-emerald-300" : "text-zinc-400",
      )}
    >
      {won ? `Victoire +${row.xp_pot ?? 0} XP` : "Défaite"}
    </p>
  )
}

// =============================================================================
// Empty state
// =============================================================================

function FriendDefisEmptyState({ filter }: { filter: StatusFilter }) {
  const messages: Record<StatusFilter, { title: string; description: string }> = {
    pending: {
      title: "Aucune invitation",
      description:
        "Pas de défi en attente. Lance-en un pour challenger ton crew !",
    },
    active: {
      title: "Aucun défi en cours",
      description:
        "Accepte une invitation ou crée un nouveau défi pour démarrer la compétition.",
    },
    completed: {
      title: "Aucun défi terminé",
      description: "Tes premiers résultats apparaîtront ici dès qu'un défi sera réglé.",
    },
  }

  const msg = messages[filter]

  return (
    <SharedEmptyState
      preset="quests"
      size="default"
      title={msg.title}
      description={msg.description}
    />
  )
}

// =============================================================================
// Helpers
// =============================================================================

function computeDaysLeft(iso: string | null | undefined): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  if (ms < 0) return null
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function friendlyKindLabel(kind: FriendChallengeRow["challenge_kind"]): string | null {
  switch (kind) {
    case "quiz_battle":
      return "Quiz battle"
    case "mission_race":
      return "Course aux missions"
    case "physical_count":
      return "Défi physique"
    case "streak_race":
      return "Course aux streaks"
    case "xp_duel":
      return "Duel XP"
    case "custom":
      return "Défi personnalisé"
    default:
      return null
  }
}

function describeChallenge(row: FriendChallengeRow, isCreator: boolean): string {
  // Compose a single-sentence description used for the card body. Keeps
  // it short — DefiCard line-clamps to 2 lines.
  const role = isCreator ? "Tu as lancé ce défi" : "Tu as été défié"
  const kind = friendlyKindLabel(row.challenge_kind)
  const target = row.target_value
    ? ` — objectif ${row.target_value.toLocaleString()}`
    : ""
  return [role, kind, target].filter(Boolean).join(" · ").replace(" · — ", " — ")
}
