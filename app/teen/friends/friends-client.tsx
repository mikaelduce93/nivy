"use client"

import { useEffect, useState, useOptimistic, startTransition } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { EASE_STANDARD, DURATION_NORMAL } from "@/lib/motion/easing"
import {
  Users,
  Search,
  UserPlus,
  MessageCircle,
  Zap,
  Trophy,
  MoreVertical,
  Check,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/states/empty-state"
import { SwipeableCard } from "@/components/ui/swipeable-card"
import { useOptimisticRunner } from "@/lib/hooks/use-optimistic-mutation"
import { toast as juicyToast } from "@/lib/utils/toast"
import { useAnnounce } from "@/components/a11y/announce-region"
import { Celebrate } from "@/components/ui/celebrate"

type ApiFriend = {
  id: string
  name: string
  avatar_url?: string | null
  status: string
  xp: number
  mutual: number
  mutual_calculated?: boolean
}

// TICKET-046 (Wave-3 U5): pending friend requests now load from
// /api/teen/friends/requests?direction=incoming. Accept/decline POST to
// /api/teen/friends/requests/[id]/{accept,decline}.
type PendingRequest = {
  id: string
  sender_id: string
  name: string
  avatar_url: string | null
  mutual: number
  sentAt: string
}

function timeAgo(iso: string | null | undefined): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const diffMin = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000))
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  const diffD = Math.floor(diffH / 24)
  return `Il y a ${diffD}j`
}

const TABS = [
  { id: "all", label: "Tous" },
  { id: "online", label: "En ligne" },
  { id: "requests", label: "Demandes" },
]

/**
 * Friend recommendation row, mirrors the response shape of
 * GET /api/teen/recommend-friends (FD3 / TICKET-021).
 */
export type FriendSuggestion = {
  teen_id: string
  name: string
  level: number
  last_seen: string | null
  similarity: number
  source: "neighbours" | "affinity"
}

interface FriendsClientProps {
  initialSuggestions: FriendSuggestion[]
}

export default function FriendsClient({ initialSuggestions }: FriendsClientProps) {
  // TICKET-026 (Wave 3 / W3-A9) — honour prefers-reduced-motion. When the
  // user has motion disabled we skip the FLIP `layout` prop and the
  // initial enter animation; rows simply snap in.
  const reduced = usePrefersReducedMotion()
  const [tab, setTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [friends, setFriends] = useState<ApiFriend[]>([])
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null)
  // Wave 3 / TICKET-022 — fire <Celebrate> when an incoming friend request
  // is accepted. Edge-triggered.
  const [celebrate, setCelebrate] = useState(false)

  // Wave 3 / TICKET-050 — SR announcement when an incoming friend request
  // is accepted. Personalised with the sender's name when available.
  const announce = useAnnounce()

  // TICKET-031 — accept/decline are high-frequency, so the row should slide
  // out instantly. useOptimistic projects a "pending removal" set on top of
  // the canonical request list; we drop the row from confirmed state only on
  // a 2xx response.
  const [optimisticRequests, removeRequestOptimistic] = useOptimistic(
    requests,
    (state: PendingRequest[], removedId: string) =>
      state.filter((r) => r.id !== removedId),
  )

  // TICKET-038: swipe-to-dismiss suggestions. Track locally-dismissed ids so
  // swiping a card removes it from this session's view (the next page-load
  // re-fetches fresh recommendations from FD3).
  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<Set<string>>(
    () => new Set<string>(),
  )

  // Show only the top 5 suggestions per TICKET-036 acceptance criteria,
  // minus any the user has just swiped away.
  const suggestions = initialSuggestions
    .filter((s) => !dismissedSuggestionIds.has(s.teen_id))
    .slice(0, 5)

  useEffect(() => {
    let cancelled = false
    fetch("/api/teen/friends")
      .then((r) => (r.ok ? r.json() : { friends: [] }))
      .then((data) => {
        if (cancelled) return
        setFriends(Array.isArray(data?.friends) ? data.friends : [])
      })
      .catch(() => {
        if (!cancelled) setFriends([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load incoming friend requests once on mount so the badge count is accurate
  // before the user clicks the "Demandes" tab.
  useEffect(() => {
    let cancelled = false
    setLoadingRequests(true)
    fetch("/api/teen/friends/requests?direction=incoming")
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((data) => {
        if (cancelled) return
        const list: PendingRequest[] = (data?.requests ?? []).map((req: any) => {
          const senderName =
            [req?.sender?.first_name, req?.sender?.last_name]
              .filter(Boolean)
              .join(" ")
              .trim() || "Demande"
          return {
            id: req.id as string,
            sender_id: (req.sender_id ?? req?.sender?.id) as string,
            name: senderName,
            avatar_url: (req?.sender?.avatar_url as string) ?? null,
            mutual: (req?.mutual_friends_count as number) ?? 0,
            sentAt: timeAgo((req?.created_at as string) ?? null),
          }
        })
        setRequests(list)
      })
      .catch(() => {
        if (!cancelled) setRequests([])
      })
      .finally(() => {
        if (!cancelled) setLoadingRequests(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  function respondToRequest(requestId: string, action: "accept" | "decline") {
    if (actioningRequestId) return
    setActioningRequestId(requestId)

    // Capture the sender's name BEFORE the optimistic removal — once the
    // row is filtered out we lose access to it and the SR announcement
    // would lose its personalisation.
    const senderName = requests.find((r) => r.id === requestId)?.name ?? null

    // Optimistic removal — must run inside a transition so useOptimistic
    // can revert if the network call fails.
    startTransition(async () => {
      removeRequestOptimistic(requestId)
      try {
        const res = await fetch(`/api/teen/friends/requests/${requestId}/${action}`, {
          method: "POST",
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)

        // Confirm — commit removal to the canonical state. The optimistic
        // layer now matches reality.
        setRequests((prev) => prev.filter((r) => r.id !== requestId))

        if (action === "accept") {
          // Wave 3 / TICKET-022 — celebrate the new friendship.
          setCelebrate(true)
          // Wave 3 / TICKET-050 — SR announcement on accept-success.
          announce(
            senderName
              ? `${senderName} a accepté ton invitation!`
              : "Invitation acceptée!",
          )
          // Refresh friends list so the newly-accepted peer shows up.
          try {
            const json = await fetch("/api/teen/friends").then((r) => r.json())
            if (json && Array.isArray(json.friends)) setFriends(json.friends)
          } catch {
            /* ignore — list will refresh on next mount */
          }
        }
      } catch {
        // Rollback: optimistic state auto-reverts to `requests` once the
        // transition settles, so the row reappears.
        toast.error(
          action === "accept"
            ? "Impossible d'accepter la demande — réessaie"
            : "Impossible de refuser la demande — réessaie",
        )
      } finally {
        setActioningRequestId(null)
      }
    })
  }

  // TICKET-031 (W2-A18): friend-request *send* via useOptimisticRunner —
  // the "Inviter" pill flips to "Invité" instantly. On error we roll back
  // the optimistic flag and surface a juicy toast so the user can retry.
  // (Accept/decline of incoming requests is owned by W2-A17.)
  const inviteRunner = useOptimisticRunner<
    { targetTeenId: string },
    { ok: true },
    { targetTeenId: string; wasInvited: boolean }
  >(
    async ({ targetTeenId }) => {
      const res = await fetch("/api/teen/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTeenId }),
      })
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }
      return { ok: true as const }
    },
    {
      onMutate: ({ targetTeenId }) => {
        const wasInvited = invitedIds.has(targetTeenId)
        setInvitedIds((prev) => {
          const next = new Set(prev)
          next.add(targetTeenId)
          return next
        })
        return { targetTeenId, wasInvited }
      },
      onError: (_err, _input, ctx) => {
        if (ctx && !ctx.wasInvited) {
          setInvitedIds((prev) => {
            const next = new Set(prev)
            next.delete(ctx.targetTeenId)
            return next
          })
        }
        juicyToast.error("Demande d'ami non envoyée. Réessaie dans un instant.")
      },
      onSuccess: () => {
        juicyToast.success("Demande envoyée !")
      },
    },
  )

  function inviteSuggestion(targetTeenId: string) {
    if (invitedIds.has(targetTeenId)) return
    inviteRunner.mutate({ targetTeenId })
  }

  const filteredFriends = friends.filter((friend) => {
    if (!friend.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (tab === "online" && friend.status !== "online") return false
    return true
  })

  const onlineCount = friends.filter((f) => f.status === "online").length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Wave 3 / TICKET-022 — friend-request acceptance celebration */}
      <Celebrate
        trigger={celebrate}
        variant="sparkles"
        onComplete={() => setCelebrate(false)}
      />
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent-soft to-pink-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Amis</h1>
                <p className="text-zinc-400 text-sm font-medium">
                  {friends.length} amis • {onlineCount} en ligne
                </p>
              </div>
            </div>
          </div>

          <Button className="bg-accent-soft text-black font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <label htmlFor="friend-search" className="sr-only">
            Rechercher un ami
          </label>
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400"
            aria-hidden="true"
          />
          <Input
            id="friend-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un ami..."
            aria-label="Rechercher un ami"
            className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
          />
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Filtres amis" className="flex items-center gap-2">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                aria-pressed={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-4 py-2 rounded-xl font-bold text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-soft",
                  active
                    ? "bg-accent-soft text-black"
                    : "bg-zinc-900/50 text-zinc-300 hover:text-white",
                )}
              >
                {t.label}
                {t.id === "requests" && optimisticRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-xs">
                    <span className="sr-only">
                      {optimisticRequests.length} demande{optimisticRequests.length > 1 ? "s" : ""} en attente
                    </span>
                    <span aria-hidden="true">{optimisticRequests.length}</span>
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </header>

      {/* Pending Requests */}
      {tab === "requests" && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">Demandes en attente</h2>

          {loadingRequests ? (
            <div className="text-zinc-500 text-sm">Chargement…</div>
          ) : optimisticRequests.length === 0 ? (
            <EmptyState
              preset="search"
              size="small"
              title="Aucune demande"
              description="Tu n'as pas de demande d'ami en attente pour le moment."
            />
          ) : (
            <div className="space-y-3">
              {optimisticRequests.map((request, idx) => (
                // TICKET-038: friend-request gestures.
                //   Right-swipe → accept (green reveal)
                //   Left-swipe  → decline (red reveal)
                // Both buttons remain available for keyboard / non-touch users.
                <SwipeableCard
                  key={request.id}
                  onSwipeRight={() => respondToRequest(request.id, "accept")}
                  onSwipeLeft={() => respondToRequest(request.id, "decline")}
                  onSwipeDelete={() => {
                    /* dismiss handled by callbacks above */
                  }}
                  disabled={actioningRequestId === request.id}
                  leftAction={
                    <span className="px-3 py-1 rounded-full bg-red-500 text-white text-xs font-bold">
                      Refuser
                    </span>
                  }
                  rightAction={
                    <span className="px-3 py-1 rounded-full bg-green-500 text-white text-xs font-bold">
                      Accepter
                    </span>
                  }
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-accent-soft/10 border border-accent-soft/30"
                  >
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-xl font-bold text-white">
                      {request.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white">{request.name}</h4>
                      <p className="text-sm text-zinc-400">
                        {request.mutual > 0 ? `${request.mutual} amis en commun • ` : ""}
                        {request.sentAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        className="rounded-full bg-success-soft text-black"
                        onClick={() => respondToRequest(request.id, "accept")}
                        disabled={actioningRequestId === request.id}
                        aria-label={`Accepter la demande de ${request.name}`}
                      >
                        <Check className="w-5 h-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => respondToRequest(request.id, "decline")}
                        disabled={actioningRequestId === request.id}
                        aria-label={`Refuser la demande de ${request.name}`}
                      >
                        <X className="w-5 h-5" />
                      </Button>
                    </div>
                  </motion.div>
                </SwipeableCard>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Friends List */}
      {tab !== "requests" && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">
            {tab === "online" ? "En ligne maintenant" : "Tous les amis"}
          </h2>

          {filteredFriends.length === 0 ? (
            friends.length === 0 ? (
              <EmptyState preset="friends" size="default" />
            ) : (
              <EmptyState
                preset="search"
                size="small"
                title={searchQuery ? "Aucun ami trouvé" : "Aucun ami en ligne"}
                description={
                  searchQuery
                    ? "Essaie une autre recherche"
                    : "Tes amis sont hors ligne pour le moment."
                }
              />
            )
          ) : (
            // TICKET-026 (Wave 3 / W3-A9) — FLIP layout animations on the
            // filtered friends list. AnimatePresence + popLayout pulls
            // exiting rows out of flow so the rest reflow smoothly when
            // the user toggles "all"/"online" or types in the search box.
            <div className="space-y-3">
              <AnimatePresence mode="popLayout" initial={false}>
                {filteredFriends.map((friend) => (
                <motion.div
                  key={friend.id}
                  layout={reduced ? false : true}
                  initial={reduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: reduced ? 0 : DURATION_NORMAL,
                    ease: EASE_STANDARD,
                  }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-xl font-bold text-white">
                      {friend.name.charAt(0)}
                    </div>
                    <div
                      role="img"
                      aria-label={
                        friend.status === "online"
                          ? "En ligne"
                          : friend.status === "away"
                          ? "Absent"
                          : "Hors ligne"
                      }
                      className={cn(
                        "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-zinc-900",
                        friend.status === "online"
                          ? "bg-green-500"
                          : friend.status === "away"
                          ? "bg-yellow-500"
                          : "bg-zinc-500",
                      )}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-white">{friend.name}</h4>
                    </div>
                    {friend.mutual_calculated && friend.mutual > 0 && (
                      <p className="text-sm text-zinc-400">{friend.mutual} amis en commun</p>
                    )}
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-brand-soft">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold">{friend.xp.toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-zinc-400 uppercase">XP</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Envoyer un message à ${friend.name}`}
                    >
                      <MessageCircle className="w-5 h-5" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-full"
                      aria-label={`Plus d'options pour ${friend.name}`}
                    >
                      <MoreVertical className="w-5 h-5" aria-hidden="true" />
                    </Button>
                  </div>
                </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      )}

      {/* Suggestions — TICKET-036: surfaces FD3's /api/teen/recommend-friends.
          Up to 5 candidates ranked by teen_neighbours.similarity. */}
      {tab !== "requests" && (
        <section className="space-y-4" aria-label="Suggestions d'amis">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-soft" />
            <h2 className="text-xl font-black uppercase">Suggestions</h2>
          </div>

          {suggestions.length === 0 ? (
            <div className="p-6 rounded-2xl bg-zinc-900/40 border border-white/5 text-sm text-zinc-400">
              Aucune suggestion pour le moment
            </div>
          ) : (
            <div className="space-y-3">
              {suggestions.map((sugg, idx) => {
                const invited = invitedIds.has(sugg.teen_id)
                const similarityPct = Math.round(
                  Math.max(0, Math.min(1, sugg.similarity)) * 100,
                )
                return (
                  // TICKET-038: dismiss a suggestion by swiping it away in
                  // either direction. We only update local state — the
                  // server-side recommender will re-rank on next visit.
                  <SwipeableCard
                    key={sugg.teen_id}
                    onSwipeDelete={() =>
                      setDismissedSuggestionIds((prev) => {
                        const next = new Set(prev)
                        next.add(sugg.teen_id)
                        return next
                      })
                    }
                    leftAction={
                      <span className="px-3 py-1 rounded-full bg-zinc-700 text-white text-xs font-bold">
                        Masquer
                      </span>
                    }
                    rightAction={
                      <span className="px-3 py-1 rounded-full bg-zinc-700 text-white text-xs font-bold">
                        Masquer
                      </span>
                    }
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-brand-soft/30 transition-colors"
                    >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-xl font-bold text-white">
                      {sugg.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white truncate">{sugg.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-zinc-400 font-medium">
                          Niveau {sugg.level}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full bg-brand-soft/15 border border-brand-soft/30 text-[10px] font-bold uppercase tracking-wide text-brand-soft"
                          title={
                            sugg.source === "neighbours"
                              ? "Affinité calculée par teen_neighbours"
                              : "Affinité estimée (cosine fallback)"
                          }
                        >
                          {similarityPct}% match
                        </span>
                      </div>
                    </div>

                    {/* Action */}
                    <Button
                      onClick={() => inviteSuggestion(sugg.teen_id)}
                      disabled={invited}
                      className={cn(
                        "font-bold",
                        invited
                          ? "bg-zinc-800 text-zinc-400"
                          : "bg-brand-soft text-black hover:bg-brand-soft/90",
                      )}
                    >
                      {invited ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Invité
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-1" />
                          Inviter
                        </>
                      )}
                    </Button>
                    </motion.div>
                  </SwipeableCard>
                )
              })}
            </div>
          )}
        </section>
      )}

      {/* Leaderboard Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-6 rounded-3xl bg-gradient-to-r from-yellow-500/10 to-amber-500/5 border border-yellow-500/20"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-yellow-500/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-yellow-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-black text-white">Classement Amis</h3>
            <p className="text-sm text-zinc-400">Vois qui a le plus d&apos;XP parmi tes amis</p>
          </div>
          <Button variant="outline">Voir le classement</Button>
        </div>
      </motion.div>
    </div>
  )
}
