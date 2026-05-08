"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
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
  const [tab, setTab] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [friends, setFriends] = useState<ApiFriend[]>([])
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [requests, setRequests] = useState<PendingRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [actioningRequestId, setActioningRequestId] = useState<string | null>(null)

  // Show only the top 5 suggestions per TICKET-036 acceptance criteria.
  const suggestions = initialSuggestions.slice(0, 5)

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

  async function respondToRequest(requestId: string, action: "accept" | "decline") {
    if (actioningRequestId) return
    setActioningRequestId(requestId)
    try {
      const res = await fetch(`/api/teen/friends/requests/${requestId}/${action}`, {
        method: "POST",
      })
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId))
        if (action === "accept") {
          // Refresh friends list so the newly-accepted peer shows up.
          try {
            const json = await fetch("/api/teen/friends").then((r) => r.json())
            if (json && Array.isArray(json.friends)) setFriends(json.friends)
          } catch {
            /* ignore — list will refresh on next mount */
          }
        }
      }
    } finally {
      setActioningRequestId(null)
    }
  }

  async function inviteSuggestion(targetTeenId: string) {
    if (invitedIds.has(targetTeenId)) return
    // Optimistic UI — flip immediately, revert on hard failure.
    setInvitedIds((prev) => {
      const next = new Set(prev)
      next.add(targetTeenId)
      return next
    })
    try {
      const res = await fetch("/api/teen/friends", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetTeenId }),
      })
      if (!res.ok) {
        // Roll back the optimistic flag so the user can retry.
        setInvitedIds((prev) => {
          const next = new Set(prev)
          next.delete(targetTeenId)
          return next
        })
      }
    } catch {
      setInvitedIds((prev) => {
        const next = new Set(prev)
        next.delete(targetTeenId)
        return next
      })
    }
  }

  const filteredFriends = friends.filter((friend) => {
    if (!friend.name.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (tab === "online" && friend.status !== "online") return false
    return true
  })

  const onlineCount = friends.filter((f) => f.status === "online").length

  return (
    <div className="min-h-screen pb-32 space-y-8 pt-6">
      {/* Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                <Users className="w-6 h-6 text-black" />
              </div>
              <div>
                <h1 className="text-4xl font-black tracking-tighter uppercase italic">Amis</h1>
                <p className="text-zinc-500 text-sm font-medium">
                  {friends.length} amis • {onlineCount} en ligne
                </p>
              </div>
            </div>
          </div>

          <Button className="bg-gen-z-coral text-black font-bold">
            <UserPlus className="w-4 h-4 mr-2" />
            Ajouter
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un ami..."
            className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
          />
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-sm transition-all",
                tab === t.id
                  ? "bg-gen-z-coral text-black"
                  : "bg-zinc-900/50 text-zinc-400 hover:text-white",
              )}
            >
              {t.label}
              {t.id === "requests" && requests.length > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-white/20 text-[10px]">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </header>

      {/* Pending Requests */}
      {tab === "requests" && (
        <section className="space-y-4">
          <h2 className="text-xl font-black uppercase">Demandes en attente</h2>

          {loadingRequests ? (
            <div className="text-zinc-500 text-sm">Chargement…</div>
          ) : requests.length === 0 ? (
            <EmptyState
              preset="search"
              size="small"
              title="Aucune demande"
              description="Tu n'as pas de demande d'ami en attente pour le moment."
            />
          ) : (
            <div className="space-y-3">
              {requests.map((request, idx) => (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-gen-z-coral/10 border border-gen-z-coral/30"
                >
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
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
                      className="rounded-full bg-gen-z-mint text-black"
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
            <div className="space-y-3">
              {filteredFriends.map((friend, idx) => (
                <motion.div
                  key={friend.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors"
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
                      {friend.name.charAt(0)}
                    </div>
                    <div
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
                    <div className="flex items-center gap-1 text-gen-z-lavender">
                      <Zap className="w-4 h-4" />
                      <span className="font-bold">{friend.xp.toLocaleString()}</span>
                    </div>
                    <p className="text-[10px] text-zinc-500 uppercase">XP</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MessageCircle className="w-5 h-5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                      <MoreVertical className="w-5 h-5" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Suggestions — TICKET-036: surfaces FD3's /api/teen/recommend-friends.
          Up to 5 candidates ranked by teen_neighbours.similarity. */}
      {tab !== "requests" && (
        <section className="space-y-4" aria-label="Suggestions d'amis">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-gen-z-lavender" />
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
                  <motion.div
                    key={sugg.teen_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-900/50 border border-white/5 hover:border-gen-z-lavender/30 transition-colors"
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
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
                          className="px-2 py-0.5 rounded-full bg-gen-z-lavender/15 border border-gen-z-lavender/30 text-[10px] font-bold uppercase tracking-wide text-gen-z-lavender"
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
                          : "bg-gen-z-lavender text-black hover:bg-gen-z-lavender/90",
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
