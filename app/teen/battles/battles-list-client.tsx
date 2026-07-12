"use client"

/**
 * Client du lobby /teen/battles (G4-B2).
 *
 * - « Défier un ami » : picker limité aux amis `accepted` (spec §5.1-1 —
 *   revérifié serveur par create_battle) → RPC `create_battle` → salon.
 * - Invitations reçues : accept (→ salon) / decline (refus silencieux,
 *   spec §5.1-2).
 * - Battles en cours (invited sortantes / lobby / active) : reprendre.
 * - Terminées : résultat + Revanche 1 tap (P12 — comptée dans les
 *   plafonds quotidiens, l'UI l'annonce).
 *
 * Toutes les actions passent par les RPC SECURITY DEFINER de la spec §3.3
 * (l'agent DB les livre en parallèle). RPC absente en base → écran
 * « Les battles arrivent bientôt » (jamais de crash).
 */

import { useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check,
  ChevronRight,
  Clock,
  Plus,
  Swords,
  Trophy,
  Users,
  X,
  Zap,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach, NivEmpty } from "@/components/brand"
import { cn } from "@/lib/utils"
import {
  battleErrorMessage,
  battleRpcFailure,
  isMissingSchemaError,
  type BattleListItem,
  type BattlePlayer,
} from "@/lib/battles/types"
import { BattlesComingSoon } from "./battles-coming-soon"

interface BattlesListClientProps {
  teenId: string
  battles: BattleListItem[]
  friends: BattlePlayer[]
}

export function BattlesListClient({ teenId, battles, friends }: BattlesListClientProps) {
  const router = useRouter()
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  // Socle DB absent (mig 181/182 pas appliquée) → dégradation totale.
  const [unavailable, setUnavailable] = useState(false)

  const buckets = useMemo(() => {
    const incoming: BattleListItem[] = []
    const ongoing: BattleListItem[] = []
    const finished: BattleListItem[] = []
    for (const b of battles) {
      if (answeredIds.has(b.id)) continue
      if (b.status === "invited" && !b.iAmCreator) incoming.push(b)
      else if (b.status === "invited" || b.status === "lobby" || b.status === "active")
        ongoing.push(b)
      else finished.push(b)
    }
    return { incoming, ongoing, finished: finished.slice(0, 10) }
  }, [battles, answeredIds])

  // ---------------------------------------------------------------------
  // Actions — RPC spec §3.3 (create_battle / accept_battle / decline_battle)
  // ---------------------------------------------------------------------
  async function handleRpcError(error: { code?: string; message?: string }) {
    if (isMissingSchemaError(error)) {
      setUnavailable(true)
      return
    }
    toast.error(battleErrorMessage(error.message))
  }

  /**
   * Erreur MÉTIER des RPC battles (mig 182) : refus renvoyé en jsonb
   * `{success:false, error:'code'}` SANS erreur PostgREST — à tester sur
   * `data` après chaque rpc, sinon le happy path s'exécute sur un refus
   * (not_friends, pair_daily_limit, declined_cooldown, battle_expired…).
   * Renvoie true si l'action a été refusée (toast déjà affiché).
   */
  function handleBusinessFailure(data: unknown): boolean {
    const failure = battleRpcFailure(data)
    if (!failure) return false
    toast.error(battleErrorMessage(failure))
    return true
  }

  async function createBattle(opponentId: string) {
    setBusyId(`friend:${opponentId}`)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.rpc("create_battle", {
        p_opponent_id: opponentId,
      })
      if (error) {
        await handleRpcError(error)
        return
      }
      if (handleBusinessFailure(data)) return
      // La RPC renvoie l'id de la battle créée (uuid) ou une ligne — on
      // accepte les deux formes pour rester tolérant au contrat DB.
      const battleId =
        typeof data === "string"
          ? data
          : ((data as { id?: string; battle_id?: string } | null)?.id ??
            (data as { battle_id?: string } | null)?.battle_id)
      if (battleId) {
        router.push(`/teen/battles/${battleId}`)
      } else {
        toast.success("Invitation envoyée !")
        router.refresh()
      }
    } finally {
      setBusyId(null)
    }
  }

  async function acceptBattle(battleId: string) {
    setBusyId(battleId)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.rpc("accept_battle", { p_battle_id: battleId })
      if (error) {
        await handleRpcError(error)
        return
      }
      if (handleBusinessFailure(data)) {
        // Invitation expirée/déjà tranchée : resync de la liste, pas de salon.
        router.refresh()
        return
      }
      router.push(`/teen/battles/${battleId}`)
    } finally {
      setBusyId(null)
    }
  }

  async function declineBattle(battleId: string) {
    setBusyId(battleId)
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.rpc("decline_battle", { p_battle_id: battleId })
      if (error) {
        await handleRpcError(error)
        return
      }
      if (handleBusinessFailure(data)) {
        router.refresh()
        return
      }
      // Refus silencieux (spec §5.1-2) — la ligne disparaît, c'est tout.
      setAnsweredIds((prev) => new Set(prev).add(battleId))
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function cancelBattle(battleId: string) {
    setBusyId(battleId)
    try {
      const supabase = createBrowserClient()
      // cancel_battle (mig 182) : le CRÉATEUR retire son invitation — pas de
      // declined_at, donc pas de cooldown contre soi-même.
      const { data, error } = await supabase.rpc("cancel_battle", { p_battle_id: battleId })
      if (error) {
        await handleRpcError(error)
        return
      }
      if (handleBusinessFailure(data)) {
        router.refresh()
        return
      }
      setAnsweredIds((prev) => new Set(prev).add(battleId))
      toast.success("Invitation annulée.")
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  if (unavailable) return <BattlesComingSoon />

  const hasAnything =
    buckets.incoming.length + buckets.ongoing.length + buckets.finished.length > 0

  return (
    <div className="space-y-8 pt-6">
      {/* Header éditorial */}
      <header className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink bg-gold shadow-stkr-sm">
              <Swords className="h-6 w-6 text-ink" aria-hidden />
            </div>
            <div className="space-y-1">
              <span className="eyebrow tracking-[0.16em] text-pink">1v1 · Temps réel</span>
              <h1 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-ink">
                Tes <em className="font-semibold italic text-pink">battles</em>
              </h1>
              <p className="text-sm text-mute">
                Même question, même chrono — 5 rounds de 15 secondes
              </p>
            </div>
          </div>

          <Button variant="pink" onClick={() => setPickerOpen((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            Défier un ami
          </Button>
        </div>

        <NivCoach
          mood="hype"
          message="Choisis un ami, 5 questions, 15 secondes chacune. Que le plus rapide gagne !"
        />
      </header>

      {/* Picker d'adversaire — amis accepted uniquement (spec §5.1-1) */}
      {pickerOpen ? (
        <StickerCard className="p-5 sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-ink" aria-hidden />
            <h2 className="font-display text-lg font-extrabold text-ink">
              Qui veux-tu défier ?
            </h2>
          </div>
          {friends.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-mute">
                Les battles se jouent entre amis. Ajoute des amis pour lancer ton premier duel.
              </p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teen/friends">Ajouter des amis</Link>
              </Button>
            </div>
          ) : (
            <ul className="space-y-3">
              {friends.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2 shadow-stkr-sm"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar player={f} />
                    <div className="min-w-0">
                      <p className="truncate font-display font-bold text-ink">{f.pseudo}</p>
                      <p className="font-mono text-xs text-mute">Niveau {f.level}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="pink"
                    className="shrink-0"
                    disabled={busyId === `friend:${f.id}`}
                    onClick={() => createBattle(f.id)}
                  >
                    <Swords className="mr-1 h-4 w-4" />
                    Défier
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </StickerCard>
      ) : null}

      {/* Invitations reçues */}
      {buckets.incoming.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle icon={Zap} label="Invitations reçues" count={buckets.incoming.length} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {buckets.incoming.map((b) => (
              <StickerCard key={b.id} className="p-5">
                <div className="flex items-center gap-3">
                  <PlayerAvatar player={b.other} />
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-bold text-ink">
                      {b.other.pseudo} te défie !
                    </p>
                    <p className="font-mono text-xs text-mute">
                      {b.rounds_total} rounds · 15 s par question
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="lime"
                    className="flex-1 uppercase tracking-wider"
                    disabled={busyId === b.id}
                    onClick={() => acceptBattle(b.id)}
                  >
                    <Check className="mr-1 h-4 w-4" />
                    Accepter
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 uppercase tracking-wider"
                    disabled={busyId === b.id}
                    onClick={() => declineBattle(b.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Refuser
                  </Button>
                </div>
              </StickerCard>
            ))}
          </div>
        </section>
      ) : null}

      {/* En cours */}
      {buckets.ongoing.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle icon={Clock} label="En cours" count={buckets.ongoing.length} />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {buckets.ongoing.map((b) =>
              // Invitation SORTANTE (invited + iAmCreator — les entrantes sont
              // dans `incoming`) : carte non-cliquable-entière pour laisser la
              // place au retrait d'invitation (cancel_battle, mig 182).
              b.status === "invited" ? (
                <StickerCard key={b.id} className="p-5">
                  <Link href={`/teen/battles/${b.id}`} className="block">
                    <OngoingCardBody item={b} />
                  </Link>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full uppercase tracking-wider"
                    disabled={busyId === b.id}
                    onClick={() => cancelBattle(b.id)}
                  >
                    <X className="mr-1 h-4 w-4" />
                    Annuler l&apos;invitation
                  </Button>
                </StickerCard>
              ) : (
                <Link key={b.id} href={`/teen/battles/${b.id}`} className="block">
                  <StickerCard variant="hover" className="p-5">
                    <OngoingCardBody item={b} />
                  </StickerCard>
                </Link>
              ),
            )}
          </div>
        </section>
      ) : null}

      {/* Terminées */}
      {buckets.finished.length > 0 ? (
        <section className="space-y-4">
          <SectionTitle icon={Trophy} label="Terminées" count={buckets.finished.length} />
          <div className="space-y-3">
            {buckets.finished.map((b) => (
              <StickerCard key={b.id} variant="panel" className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <PlayerAvatar player={b.other} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">
                        Contre {b.other.pseudo}
                      </p>
                      <FinishedVerdict item={b} teenId={teenId} />
                    </div>
                  </div>
                  {b.status === "resolved" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === `friend:${b.other.id}`}
                      onClick={() => createBattle(b.other.id)}
                      title="La revanche compte dans tes limites quotidiennes"
                    >
                      <Swords className="mr-1 h-4 w-4" />
                      Revanche
                    </Button>
                  ) : null}
                </div>
              </StickerCard>
            ))}
          </div>
          <p className="font-mono text-xs text-mute">
            La revanche compte dans tes limites quotidiennes de battles.
          </p>
        </section>
      ) : null}

      {!hasAnything ? (
        <NivEmpty
          mood="calm"
          title="Aucune battle pour le moment"
          description="Défie un ami pour lancer ton premier duel en temps réel — 5 questions, 15 secondes chacune."
          action={
            <Button variant="pink" onClick={() => setPickerOpen(true)}>
              <Swords className="mr-2 h-4 w-4" />
              Défier un ami
            </Button>
          }
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function SectionTitle({
  icon: Icon,
  label,
  count,
}: {
  icon: typeof Clock
  label: string
  count: number
}) {
  return (
    <div className="flex items-center gap-2 border-t-2 border-ink pt-6">
      <Icon className="h-4 w-4 text-ink" aria-hidden />
      <h2 className="font-display text-lg font-extrabold text-ink">{label}</h2>
      <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-ink/10 px-1.5 font-mono text-[10px] font-bold text-ink">
        {count}
      </span>
    </div>
  )
}

function PlayerAvatar({ player, size = "md" }: { player: BattlePlayer; size?: "sm" | "md" }) {
  const initial = (player.pseudo || "?").trim().charAt(0).toUpperCase() || "?"
  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border-2 border-ink bg-paper font-display font-extrabold text-ink",
        size === "sm" ? "h-9 w-9 text-sm" : "h-11 w-11 text-base",
      )}
    >
      {initial}
    </div>
  )
}

function OngoingCardBody({ item }: { item: BattleListItem }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <PlayerAvatar player={item.other} />
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink">
            Contre {item.other.pseudo}
          </p>
          <p className="font-mono text-xs text-mute">{ongoingLabel(item)}</p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-pink" aria-hidden />
    </div>
  )
}

function ongoingLabel(b: BattleListItem): string {
  if (b.status === "invited") return "Invitation envoyée — en attente de réponse"
  if (b.status === "lobby") return "Salle d'attente — prêt à démarrer"
  return `Round ${Math.max(1, b.current_round)}/${b.rounds_total} en cours`
}

function FinishedVerdict({ item, teenId }: { item: BattleListItem; teenId: string }) {
  if (item.status === "expired")
    return <p className="font-mono text-xs uppercase tracking-wider text-mute">Expirée</p>
  if (item.status === "cancelled")
    return <p className="font-mono text-xs uppercase tracking-wider text-mute">Refusée</p>
  if (item.is_draw)
    return (
      <p className="font-mono text-xs font-bold uppercase tracking-wider text-gold">
        Match nul
      </p>
    )
  const won = item.winner_id === teenId
  return (
    <p
      className={cn(
        "font-mono text-xs font-bold uppercase tracking-wider",
        won ? "text-lime" : "text-mute",
      )}
    >
      {won ? "Victoire 👑" : "Défaite"}
      {item.resolution === "forfeit" ? " · par forfait" : ""}
    </p>
  )
}
