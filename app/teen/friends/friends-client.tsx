"use client"

import { useEffect, useState, useOptimistic, startTransition } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "sonner"
import { usePrefersReducedMotion } from "@/lib/hooks/use-reduced-motion"
import { EASE_STANDARD, DURATION_NORMAL } from "@/lib/motion/easing"
import {
  Search,
  UserPlus,
  Zap,
  Trophy,
  Check,
  X,
  Sparkles,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/states/empty-state"
import { Niv, NivEmpty, DarkSurface } from "@/components/brand"
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
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="eyebrow text-pink">Ton crew</p>
            <h1 className="font-display text-4xl font-extrabold leading-none tracking-tight text-ink">
              Tes <em className="font-semibold italic text-pink">amis</em>
            </h1>
            <p className="font-mono text-xs text-mute">
              {friends.length} amis · {onlineCount} en ligne
            </p>
          </div>

          <Niv mood="happy" size={64} className="shrink-0" />
        </div>

        {/* Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <label htmlFor="friend-search" className="sr-only">
              Rechercher un ami
            </label>
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute"
              aria-hidden="true"
            />
            <Input
              id="friend-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un ami..."
              aria-label="Rechercher un ami"
              className="pl-12 h-12 rounded-xl bg-white border-2 border-ink"
            />
          </div>

          <Button
            variant="pink"
            className="h-12 shrink-0"
            onClick={() => {
              if (typeof document !== "undefined") {
                document.getElementById("friend-search")?.focus()
              }
            }}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Tabs */}
        <div role="tablist" aria-label="Filtres amis" className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={cn(
                  "shrink-0 px-4 py-2 rounded-xl border-2 border-ink font-mono text-xs font-bold uppercase tracking-wide transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40",
                  active
                    ? "bg-ink text-paper shadow-stkr-pink"
                    : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-sm",
                )}
              >
                {t.label}
                {t.id === "requests" && optimisticRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 rounded-full bg-pink text-ink text-xs">
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
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Demandes en attente</h2>

          {loadingRequests ? (
            <div className="text-mute text-sm">Chargement…</div>
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
                    <span className="px-3 py-1 rounded-full bg-destructive text-ink text-xs font-bold">
                      Refuser
                    </span>
                  }
                  rightAction={
                    <span className="px-3 py-1 rounded-full bg-lime text-ink text-xs font-bold">
                      Accepter
                    </span>
                  }
                >
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md"
                  >
                    <div className="w-14 h-14 rounded-full border-2 border-ink bg-pink flex items-center justify-center text-xl font-bold text-ink">
                      {request.name.charAt(0).toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-ink">{request.name}</h4>
                      <p className="text-sm text-mute">
                        {request.mutual > 0 ? `${request.mutual} amis en commun • ` : ""}
                        {request.sentAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="lime"
                        className="rounded-full"
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
          <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">
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
                  className="flex items-center gap-4 p-4 rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-ink bg-pink flex items-center justify-center text-xl font-bold text-ink">
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
                        "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-ink",
                        friend.status === "online"
                          ? "bg-lime"
                          : friend.status === "away"
                          ? "bg-gold"
                          : "bg-muted",
                      )}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-ink">{friend.name}</h4>
                    </div>
                    {friend.mutual_calculated && friend.mutual > 0 && (
                      <p className="text-sm text-mute">{friend.mutual} amis en commun</p>
                    )}
                  </div>

                  {/* XP */}
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-gold">
                      <Zap className="w-4 h-4" />
                      <span className="font-mono font-bold tabular-nums">{friend.xp.toLocaleString()}</span>
                    </div>
                    <p className="font-mono text-xs text-mute uppercase">XP</p>
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
            <Sparkles className="w-5 h-5 text-pink" />
            <h2 className="font-display text-xl font-extrabold tracking-tight text-ink">Suggestions</h2>
          </div>

          {suggestions.length === 0 ? (
            <NivEmpty
              mood="proud"
              title="Aucune suggestion pour le moment"
              description="Reviens bientôt : on te trouvera de nouveaux potes selon tes affinités."
            />
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
                      <span className="px-3 py-1 rounded-full bg-muted text-ink text-xs font-bold">
                        Masquer
                      </span>
                    }
                    rightAction={
                      <span className="px-3 py-1 rounded-full bg-muted text-ink text-xs font-bold">
                        Masquer
                      </span>
                    }
                  >
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-4 p-4 rounded-2xl border-2 border-ink bg-white text-ink shadow-stkr-md transition-all duration-200 ease-out hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"
                    >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full border-2 border-ink bg-pink flex items-center justify-center text-xl font-bold text-ink">
                      {sugg.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-ink truncate">{sugg.name}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="font-mono text-xs text-mute">
                          Niveau {sugg.level}
                        </span>
                        <span
                          className="px-2 py-0.5 rounded-full border-2 border-ink bg-teal font-mono text-[10px] font-bold uppercase tracking-wide text-paper"
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
                      variant={invited ? "outline" : "pink"}
                      onClick={() => inviteSuggestion(sugg.teen_id)}
                      disabled={invited}
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
      <DarkSurface tone="gold" shadow className="p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl border-2 border-paper/30 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-gold" />
          </div>
          <div className="flex-1">
            <h3 className="font-display text-lg font-extrabold tracking-tight text-paper">Classement Amis</h3>
            <p className="text-sm text-paper/70">Vois qui a le plus d&apos;XP parmi tes amis</p>
          </div>
          <Button asChild variant="pink" className="shrink-0">
            <Link href="/teen/leaderboard">Voir le classement</Link>
          </Button>
        </div>
      </DarkSurface>
    </div>
  )
}
