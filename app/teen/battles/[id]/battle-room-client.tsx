"use client"

/**
 * Salon de battle 1v1 temps réel (G4-B2) — client.
 *
 * États couverts (spec §3.3) : invitation (accept/refuse), salle d'attente
 * (presence + ready), countdown 3-2-1, round (question strippée + 4 options +
 * chrono 15 s circulaire), « en attente de l'adversaire », révélation des
 * scores à la CLÔTURE du round uniquement (spec §3.2/§3.4-4b : le serveur ne
 * publie score/correct_count qu'à l'advance — mi-round seul `answered_current`
 * bouge), écran final (scores, XP, revanche), forfait/déconnexion.
 *
 * Temps réel (§3.2, événements EXACTS) — channel `battle:{id}` :
 *   - postgres_changes UPDATE `battles`             filter id=eq.{id}
 *   - postgres_changes UPDATE `battle_participants` filter battle_id=eq.{id}
 *   - presence sync/join/leave                      payload {teen_id, online_at}
 *   - broadcast `reaction` (émis SERVEUR par POST /api/teen/battles/[id]/react)
 * Les lignes Postgres sont la seule autorité ; le realtime n'est qu'un miroir.
 *
 * Chrono : cosmétique uniquement — la validité d'une réponse est tranchée par
 * `now()` serveur dans submit_battle_answer avec la deadline personnelle
 * LEAST(deadline+3s, round_seen_at+15s) (§3.4-2). On affiche la même fenêtre :
 * reveal + 15 s, plafonnée à round_deadline + 3 s. L'accusé de réception
 * `battle_round_seen` part au rendu de la question ; le countdown/interstitiel
 * dure < 3 s pour rester dans le plafond d'extension.
 *
 * Aucune logique de correction ici : `current_payload` arrive déjà strippé
 * (spec §3.0/J0) — on n'affiche QUE ce que le serveur envoie.
 *
 * Dégradation : toute RPC/table absente (mig 181/182 pas appliquée — l'agent
 * DB livre en parallèle) → écran « Les battles arrivent bientôt », zéro crash.
 * L'endpoint réactions qui 404 (socle absent) → la barre d'emojis disparaît.
 *
 * Contrat d'erreur RPC (mig 182) : les refus métier arrivent en jsonb
 * `{success:false, error:'code'}` SANS erreur PostgREST — chaque action
 * teste donc `battleRpcFailure(data)` AVANT son happy path.
 */
// drift-allow: tables battles/battle_participants livrées par la mig 181 (train G4, agent DB parallèle) — régénérer db-relations.json après application.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { RealtimeChannel } from "@supabase/supabase-js"
import {
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  Flag,
  Hourglass,
  Swords,
  WifiOff,
  X,
} from "lucide-react"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { fetchWithCSRF } from "@/lib/security/fetch-with-csrf"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { useReducedMotion } from "@/components/ui/motion"
import { cn } from "@/lib/utils"
import {
  BATTLE_REACTION_EMOJIS,
  BATTLE_ROUND_SECONDS,
  REACTIONS_MAX_PER_BATTLE,
  REACTIONS_MAX_PER_ROUND,
  battleErrorMessage,
  battleRpcFailure,
  isMissingSchemaError,
  type BattleParticipantRow,
  type BattlePlayer,
  type BattleReactionEmoji,
  type BattleRow,
} from "@/lib/battles/types"
import { BattlesComingSoon } from "../battles-coming-soon"

// Countdown 3-2-1 (round 1) et interstitiel inter-rounds : tous deux < 3 s
// pour rester dans le plafond d'extension de la deadline personnelle (§3.4-2).
const COUNTDOWN_MS = 1800
const INTERSTITIAL_MS = 2000
const FORFEIT_AFTER_MS = 31_000 // 30 s serveur + 1 s de marge d'affichage
const HEARTBEAT_MS = 10_000

type RoomPhase =
  | { kind: "idle" }
  | { kind: "countdown"; round: number }
  | { kind: "interstitial"; round: number }
  | { kind: "question"; round: number; revealedAt: number }

interface BattleRoomClientProps {
  teenId: string
  me: BattlePlayer
  opponent: BattlePlayer
  initialBattle: BattleRow
  initialParticipants: BattleParticipantRow[]
}

function indexParticipants(
  rows: BattleParticipantRow[],
): Record<string, BattleParticipantRow> {
  const map: Record<string, BattleParticipantRow> = {}
  for (const row of rows) map[row.teen_id] = row
  return map
}

export function BattleRoomClient({
  teenId,
  me,
  opponent,
  initialBattle,
  initialParticipants,
}: BattleRoomClientProps) {
  const router = useRouter()
  const reducedMotion = Boolean(useReducedMotion())
  const supabase = useMemo(() => createBrowserClient(), [])

  const battleId = initialBattle.id
  const opponentId = opponent.id

  // ---------------------------------------------------------------- state
  const [battle, setBattle] = useState<BattleRow>(initialBattle)
  const [participants, setParticipants] = useState<Record<string, BattleParticipantRow>>(
    () => indexParticipants(initialParticipants),
  )
  const [phase, setPhase] = useState<RoomPhase>({ kind: "idle" })
  const [myAnswerIndex, setMyAnswerIndex] = useState<number | null>(null)
  const [unavailable, setUnavailable] = useState(false)
  const [connected, setConnected] = useState(true)
  const [presenceSynced, setPresenceSynced] = useState(false)
  const [opponentPresent, setOpponentPresent] = useState(true)
  const [opponentAbsentSince, setOpponentAbsentSince] = useState<number | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  // Réactions (spec §5.1-3) — set fermé, throttle UI, compteur discret, mute local.
  const [reactionsAvailable, setReactionsAvailable] = useState(true)
  const [reactionsMuted, setReactionsMuted] = useState(false)
  const [reactionCounts, setReactionCounts] = useState<Record<string, number>>({})
  const [incomingReaction, setIncomingReaction] = useState<{
    emoji: BattleReactionEmoji
    key: number
  } | null>(null)
  const [reactionCooldown, setReactionCooldown] = useState(false)

  // ----------------------------------------------------------------- refs
  const channelRef = useRef<RealtimeChannel | null>(null)
  const droppedRef = useRef(false)
  const revealedRoundRef = useRef(0)
  const seenAckedRef = useRef(0)
  const answerBusyRef = useRef(false)
  const advanceBusyRef = useRef(false)
  const startBusyRef = useRef(false)
  const reactionsMutedRef = useRef(false)
  const sentThisRoundRef = useRef(0)
  const sentTotalRef = useRef(0)

  const myParticipant = participants[teenId]
  const oppParticipant = participants[opponentId]
  const iAmCreator = battle.creator_id === teenId

  // Fenêtre personnelle affichée = miroir de LEAST(deadline+3s, seen+15s).
  const serverDeadlineMs = battle.round_deadline ? Date.parse(battle.round_deadline) : null
  const personalDeadlineMs =
    phase.kind === "question"
      ? serverDeadlineMs != null && !Number.isNaN(serverDeadlineMs)
        ? Math.min(phase.revealedAt + BATTLE_ROUND_SECONDS * 1000, serverDeadlineMs + 3000)
        : phase.revealedAt + BATTLE_ROUND_SECONDS * 1000
      : null
  // Clamp haut : `now` peut être en retard d'un tick au moment du reveal.
  const remainingMs =
    personalDeadlineMs != null
      ? Math.min(BATTLE_ROUND_SECONDS * 1000, Math.max(0, personalDeadlineMs - now))
      : null
  const timeUp = remainingMs !== null && remainingMs <= 0

  // Miroir mutable pour les boucles à intervalle (évite les effets qui churn).
  const liveRef = useRef({ participants, personalDeadlineMs, unavailable })
  liveRef.current = { participants, personalDeadlineMs, unavailable }

  // ------------------------------------------------------------ snapshot
  // Resync complet depuis Postgres (autorité) — reconnexion, retour d'onglet,
  // ou après une RPC qui a pu devancer le miroir realtime.
  const fetchSnapshot = useCallback(async () => {
    try {
      const [battleRes, participantsRes] = await Promise.all([
        supabase.from("battles").select("*").eq("id", battleId).maybeSingle(),
        supabase.from("battle_participants").select("*").eq("battle_id", battleId),
      ])
      const err = battleRes.error ?? participantsRes.error
      if (err) {
        if (isMissingSchemaError(err)) setUnavailable(true)
        else console.warn("[battle] resync error:", err.message)
        return
      }
      if (battleRes.data) setBattle(battleRes.data as unknown as BattleRow)
      if (Array.isArray(participantsRes.data)) {
        setParticipants(
          indexParticipants(participantsRes.data as unknown as BattleParticipantRow[]),
        )
      }
    } catch (e) {
      console.warn("[battle] resync threw:", (e as Error).message)
    }
  }, [supabase, battleId])

  // ------------------------------------------------- channel battle:{id}
  useEffect(() => {
    const channel = supabase.channel(`battle:${battleId}`, {
      config: { presence: { key: teenId } },
    })
    const refreshPresence = () => {
      const state = channel.presenceState() as Record<string, unknown[]>
      setPresenceSynced(true)
      setOpponentPresent(Boolean(state[opponentId]?.length))
    }
    channel
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "battles", filter: `id=eq.${battleId}` },
        (payload: { new: Partial<BattleRow> }) => {
          setBattle((prev) => ({ ...prev, ...(payload.new ?? {}) }))
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "battle_participants",
          filter: `battle_id=eq.${battleId}`,
        },
        (payload: { new: Partial<BattleParticipantRow> }) => {
          const row = payload.new
          const rowTeenId = row?.teen_id
          if (!rowTeenId) return
          setParticipants((prev) => ({
            ...prev,
            [rowTeenId]: { ...(prev[rowTeenId] ?? {}), ...row } as BattleParticipantRow,
          }))
        },
      )
      .on("presence", { event: "sync" }, refreshPresence)
      .on("presence", { event: "join" }, refreshPresence)
      .on("presence", { event: "leave" }, refreshPresence)
      .on(
        "broadcast",
        { event: "reaction" },
        ({ payload }: { payload?: { emoji?: string; teen_id?: string } }) => {
          const emoji = payload?.emoji as BattleReactionEmoji | undefined
          if (!emoji || !BATTLE_REACTION_EMOJIS.includes(emoji)) return
          // Mes propres envois sont déjà comptés à l'émission (optimiste).
          if (payload?.teen_id && payload.teen_id === teenId) return
          setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }))
          if (!reactionsMutedRef.current) setIncomingReaction({ emoji, key: Date.now() })
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          setConnected(true)
          if (droppedRef.current) {
            droppedRef.current = false
            void fetchSnapshot()
          }
          void channel.track({ teen_id: teenId, online_at: new Date().toISOString() })
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
          droppedRef.current = true
          setConnected(false)
        }
      })
    channelRef.current = channel
    return () => {
      channelRef.current = null
      void supabase.removeChannel(channel)
    }
  }, [supabase, battleId, teenId, opponentId, fetchSnapshot])

  // -------------------------------------------- réseau navigateur + onglet
  useEffect(() => {
    const onOnline = () => {
      setConnected(true)
      void fetchSnapshot()
    }
    const onOffline = () => setConnected(false)
    const onVisibility = () => {
      if (document.visibilityState === "visible") void fetchSnapshot()
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", onOffline)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("offline", onOffline)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [fetchSnapshot])

  // ---------------------------------------------------- accusé round vu
  const ackRoundSeen = useCallback(
    async (round: number) => {
      if (seenAckedRef.current >= round) return
      seenAckedRef.current = round
      const { error } = await supabase.rpc("battle_round_seen", {
        p_battle_id: battleId,
        p_round_no: round,
      })
      if (error && isMissingSchemaError(error)) setUnavailable(true)
      // Autres erreurs : best-effort — sans ack le serveur retombe sur la
      // deadline commune + 1 s (§3.4-2), la battle reste jouable.
    },
    [supabase, battleId],
  )

  // ------------------------------------- machine countdown → question
  useEffect(() => {
    if (battle.status !== "active" || battle.current_round < 1) return
    if (revealedRoundRef.current === battle.current_round) return
    revealedRoundRef.current = battle.current_round
    const round = battle.current_round
    // Reset de l'état par-round.
    setMyAnswerIndex(null)
    answerBusyRef.current = false
    sentThisRoundRef.current = 0
    const isFirst = round === 1
    setPhase({ kind: isFirst ? "countdown" : "interstitial", round })
    const t = setTimeout(
      () => {
        setPhase({ kind: "question", round, revealedAt: Date.now() })
        void ackRoundSeen(round)
      },
      isFirst ? COUNTDOWN_MS : INTERSTITIAL_MS,
    )
    return () => clearTimeout(t)
  }, [battle.status, battle.current_round, ackRoundSeen])

  // ------------------------------------------------------------- ticker
  const needsTicker =
    (battle.status === "active" && phase.kind === "question") ||
    (battle.status === "active" && presenceSynced && !opponentPresent)
  useEffect(() => {
    if (!needsTicker) return
    setNow(Date.now())
    const iv = setInterval(() => setNow(Date.now()), 150)
    return () => clearInterval(iv)
  }, [needsTicker])

  // ---------------------------------------------------------- heartbeat
  useEffect(() => {
    if (battle.status !== "lobby" && battle.status !== "active") return
    const send = async () => {
      const { error } = await supabase.rpc("battle_heartbeat", { p_battle_id: battleId })
      if (error && isMissingSchemaError(error)) setUnavailable(true)
    }
    void send()
    const iv = setInterval(() => void send(), HEARTBEAT_MS)
    return () => clearInterval(iv)
  }, [battle.status, supabase, battleId])

  // -------------------------------------- lobby : auto-start si 2× ready
  const bothReady = Boolean(myParticipant?.is_ready && oppParticipant?.is_ready)
  useEffect(() => {
    if (battle.status !== "lobby" || !bothReady) return
    const tryStart = async () => {
      if (startBusyRef.current) return
      startBusyRef.current = true
      try {
        const { data, error } = await supabase.rpc("start_battle", { p_battle_id: battleId })
        // Refus métier jsonb (participants_not_ready… — mig 182) : silencieux,
        // la boucle réessaie ; snapshot seulement sur un vrai démarrage.
        if (!error && !battleRpcFailure(data)) void fetchSnapshot()
        else if (error && isMissingSchemaError(error)) setUnavailable(true)
        // « déjà démarrée » par l'autre client → ignoré, l'UPDATE realtime arrive.
      } finally {
        startBusyRef.current = false
      }
    }
    void tryStart()
    const iv = setInterval(() => void tryStart(), 2500)
    return () => clearInterval(iv)
  }, [battle.status, bothReady, supabase, battleId, fetchSnapshot])

  // ------------------- active : advance idempotent (2 réponses OU deadline)
  useEffect(() => {
    if (battle.status !== "active") return
    const iv = setInterval(async () => {
      const live = liveRef.current
      if (live.unavailable || advanceBusyRef.current) return
      const mine = live.participants[teenId]
      const theirs = live.participants[opponentId]
      const bothAnswered = Boolean(mine?.answered_current && theirs?.answered_current)
      const deadlinePassed =
        live.personalDeadlineMs != null && Date.now() > live.personalDeadlineMs + 1000
      if (!bothAnswered && !deadlinePassed) return
      advanceBusyRef.current = true
      try {
        const { data, error } = await supabase.rpc("advance_battle_round", {
          p_battle_id: battleId,
        })
        // Refus métier jsonb (invalid_status/round… — mig 182) : silencieux,
        // idempotent — snapshot seulement quand l'appel a réellement abouti.
        if (!error && !battleRpcFailure(data)) void fetchSnapshot()
        else if (error && isMissingSchemaError(error)) setUnavailable(true)
        // Pas mûr côté serveur (fenêtre +3 s de l'adversaire) → on réessaiera.
      } finally {
        advanceBusyRef.current = false
      }
    }, 1500)
    return () => clearInterval(iv)
  }, [battle.status, supabase, battleId, teenId, opponentId, fetchSnapshot])

  // ------------------------------------------- forfait (heartbeat absent)
  useEffect(() => {
    if (battle.status !== "active" || !presenceSynced) {
      setOpponentAbsentSince(null)
      return
    }
    if (opponentPresent) setOpponentAbsentSince(null)
    else setOpponentAbsentSince((prev) => prev ?? Date.now())
  }, [opponentPresent, battle.status, presenceSynced])

  const forfeitReadyInMs =
    opponentAbsentSince != null
      ? Math.max(0, opponentAbsentSince + FORFEIT_AFTER_MS - now)
      : null

  // --------------------------------------------------------- réactions
  useEffect(() => {
    reactionsMutedRef.current = reactionsMuted
  }, [reactionsMuted])

  useEffect(() => {
    if (!incomingReaction) return
    const t = setTimeout(() => setIncomingReaction(null), 1600)
    return () => clearTimeout(t)
  }, [incomingReaction])

  // ------------------------------------------------------------ actions
  function handleRpcFailure(error: { code?: string; message?: string }) {
    if (isMissingSchemaError(error)) setUnavailable(true)
    else toast.error(battleErrorMessage(error.message))
  }

  /**
   * Erreur MÉTIER des RPC battles (mig 182) : refus renvoyé en jsonb
   * `{success:false, error:'code'}` SANS erreur PostgREST — à tester sur
   * `data` après chaque rpc, sinon le happy path s'exécute sur un refus
   * (battle_expired, invalid_status, answer_deadline_passed…). Renvoie true
   * si l'action a été refusée (toast déjà affiché).
   */
  function handleBusinessFailure(data: unknown): boolean {
    const failure = battleRpcFailure(data)
    if (!failure) return false
    toast.error(battleErrorMessage(failure))
    return true
  }

  async function acceptBattle() {
    setBusy("accept")
    try {
      const { data, error } = await supabase.rpc("accept_battle", { p_battle_id: battleId })
      if (error) return handleRpcFailure(error)
      if (handleBusinessFailure(data)) {
        // Invitation expirée/déjà tranchée : resync — l'écran d'état suivra.
        void fetchSnapshot()
        return
      }
      void fetchSnapshot()
    } finally {
      setBusy(null)
    }
  }

  async function declineBattle() {
    setBusy("decline")
    try {
      const { data, error } = await supabase.rpc("decline_battle", { p_battle_id: battleId })
      if (error) return handleRpcFailure(error)
      if (handleBusinessFailure(data)) {
        void fetchSnapshot()
        return
      }
      router.push("/teen/battles")
    } finally {
      setBusy(null)
    }
  }

  async function cancelInvite() {
    setBusy("cancel")
    try {
      // cancel_battle (mig 182) : le CRÉATEUR retire son invitation — pas de
      // declined_at, donc pas de cooldown contre soi-même.
      const { data, error } = await supabase.rpc("cancel_battle", { p_battle_id: battleId })
      if (error) return handleRpcFailure(error)
      if (handleBusinessFailure(data)) {
        void fetchSnapshot()
        return
      }
      toast.success("Invitation annulée.")
      router.push("/teen/battles")
    } finally {
      setBusy(null)
    }
  }

  async function setReady() {
    setBusy("ready")
    try {
      const { data, error } = await supabase.rpc("set_battle_ready", { p_battle_id: battleId })
      if (error) return handleRpcFailure(error)
      if (handleBusinessFailure(data)) {
        void fetchSnapshot()
        return
      }
      // Optimiste : mon flag ready (le miroir realtime confirmera).
      setParticipants((prev) =>
        prev[teenId] ? { ...prev, [teenId]: { ...prev[teenId], is_ready: true } } : prev,
      )
    } finally {
      setBusy(null)
    }
  }

  async function submitAnswer(index: number) {
    if (phase.kind !== "question" || battle.status !== "active") return
    if (myAnswerIndex !== null || answerBusyRef.current || timeUp) return
    answerBusyRef.current = true
    // Optimiste sur MA réponse uniquement (spec §10) — jamais de verdict
    // affiché : la correction vit côté serveur, révélation à la clôture.
    setMyAnswerIndex(index)
    try {
      const { data, error } = await supabase.rpc("submit_battle_answer", {
        p_battle_id: battleId,
        p_round_no: phase.round,
        p_answer_index: index,
      })
      if (error) {
        if (isMissingSchemaError(error)) {
          setUnavailable(true)
          return
        }
        // Réponse NON enregistrée — on retire l'optimiste pour ne jamais
        // afficher « Réponse enregistrée » à tort.
        setMyAnswerIndex(null)
        toast.error(battleErrorMessage(error.message))
        return
      }
      // Refus métier (answer_deadline_passed, wrong_round… — mig 182) :
      // même traitement, l'optimiste ment sinon.
      if (handleBusinessFailure(data)) setMyAnswerIndex(null)
    } finally {
      answerBusyRef.current = false
    }
  }

  async function claimForfeit() {
    setBusy("forfeit")
    try {
      const { data, error } = await supabase.rpc("claim_forfeit", { p_battle_id: battleId })
      if (error) return handleRpcFailure(error)
      if (handleBusinessFailure(data)) {
        // opponent_still_present : la battle continue, on resynchronise.
        void fetchSnapshot()
        return
      }
      void fetchSnapshot()
    } finally {
      setBusy(null)
    }
  }

  async function rematch() {
    setBusy("rematch")
    try {
      const { data, error } = await supabase.rpc("create_battle", {
        p_opponent_id: opponentId,
      })
      if (error) return handleRpcFailure(error)
      // Refus métier (pair_daily_limit, declined_cooldown… — mig 182) :
      // surtout ne PAS naviguer vers un salon qui n'existe pas.
      if (handleBusinessFailure(data)) return
      const newId =
        typeof data === "string"
          ? data
          : ((data as { id?: string; battle_id?: string } | null)?.id ??
            (data as { battle_id?: string } | null)?.battle_id)
      if (newId) router.push(`/teen/battles/${newId}`)
      else router.push("/teen/battles")
    } finally {
      setBusy(null)
    }
  }

  async function sendReaction(emoji: BattleReactionEmoji) {
    if (!reactionsAvailable || reactionCooldown) return
    if (
      sentThisRoundRef.current >= REACTIONS_MAX_PER_ROUND ||
      sentTotalRef.current >= REACTIONS_MAX_PER_BATTLE
    ) {
      toast("Doucement ! Limite de réactions atteinte.")
      return
    }
    sentThisRoundRef.current += 1
    sentTotalRef.current += 1
    setReactionCooldown(true)
    setTimeout(() => setReactionCooldown(false), 1200)
    setReactionCounts((prev) => ({ ...prev, [emoji]: (prev[emoji] ?? 0) + 1 }))
    try {
      // Contrat spec §3.2/§5.1-3 : POST [id]/react — broadcast émis SERVEUR
      // + rate-limit serveur ≤3/round, ≤10/battle, compteurs persistés.
      const res = await fetchWithCSRF(`/api/teen/battles/${battleId}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      })
      if (res.status === 404) {
        // Socle battles absent (mig 181) ou battle introuvable → on retire
        // la barre, sans casser le match.
        setReactionsAvailable(false)
        return
      }
      if (res.status === 429) toast("Doucement !")
    } catch {
      // Réseau — réaction best-effort, jamais bloquante pour la battle.
    }
  }

  // -------------------------------------------------------------- render
  if (unavailable) return <BattlesComingSoon />

  const roundNo = Math.max(1, battle.current_round)
  const payload = battle.current_payload
  const options = Array.isArray(payload?.options) ? (payload?.options as string[]) : []

  return (
    <div className="mx-auto max-w-2xl space-y-6 pt-6">
      {/* Barre haute : retour + contexte */}
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link href="/teen/battles">
            <ArrowLeft className="mr-1 h-4 w-4" />
            Battles
          </Link>
        </Button>
        {battle.status === "active" ? (
          <span className="rounded-full border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold text-ink shadow-stkr-sm">
            Round {roundNo}/{battle.rounds_total}
          </span>
        ) : null}
      </div>

      {/* Bannière reconnexion (ma propre connexion) */}
      {!connected ? (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-white px-4 py-3 shadow-stkr-sm"
        >
          <WifiOff className="h-5 w-5 shrink-0 text-coral" aria-hidden />
          <p className="text-sm font-bold text-coral">
            Connexion perdue — reconnexion en cours…
          </p>
        </div>
      ) : null}

      {/* Bandeau scores — ne bouge qu'à la clôture d'un round (spec §3.4-4b) */}
      {battle.status !== "invited" ? (
        <StickerCard className="relative p-4">
          <div className="flex items-center justify-between gap-2">
            <PlayerSide
              player={me}
              label="Toi"
              score={myParticipant?.score ?? 0}
              online
              answered={battle.status === "active" && Boolean(myParticipant?.answered_current)}
            />
            <span className="shrink-0 font-display text-lg font-extrabold text-pink">VS</span>
            <PlayerSide
              player={opponent}
              label={opponent.pseudo}
              score={oppParticipant?.score ?? 0}
              online={!presenceSynced || opponentPresent}
              answered={battle.status === "active" && Boolean(oppParticipant?.answered_current)}
              align="right"
            />
          </div>
          {/* Réaction entrante — pop discret côté adversaire (mute local possible) */}
          {incomingReaction ? (
            <span
              key={incomingReaction.key}
              aria-hidden
              className={cn(
                "absolute -top-3 right-3 text-2xl",
                !reducedMotion && "animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300",
              )}
            >
              {incomingReaction.emoji}
            </span>
          ) : null}
        </StickerCard>
      ) : null}

      {/* ------------------------------------------------ INVITED */}
      {battle.status === "invited" ? (
        iAmCreator ? (
          <StickerCard className="space-y-4 p-6 text-center">
            <Hourglass className="mx-auto h-8 w-8 text-gold" aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">
                Invitation envoyée à {opponent.pseudo}
              </h1>
              <p className="mt-1 text-sm text-mute">
                {battle.rounds_total} rounds · {BATTLE_ROUND_SECONDS} s par question ·{" "}
                {expiresLabel(battle.expires_at)}
              </p>
            </div>
            <p className="font-mono text-xs text-mute">
              Dès que {opponent.pseudo} accepte, la salle d&apos;attente s&apos;ouvre ici.
            </p>
            <Button
              variant="outline"
              className="min-h-12 w-full uppercase tracking-wider"
              disabled={busy !== null}
              onClick={cancelInvite}
            >
              <X className="mr-1 h-4 w-4" />
              Annuler l&apos;invitation
            </Button>
          </StickerCard>
        ) : (
          <StickerCard className="space-y-5 p-6 text-center">
            <Swords className="mx-auto h-8 w-8 text-pink" aria-hidden />
            <div>
              <h1 className="font-display text-2xl font-extrabold text-ink">
                {opponent.pseudo} te défie !
              </h1>
              <p className="mt-1 text-sm text-mute">
                {battle.rounds_total} rounds · {BATTLE_ROUND_SECONDS} s par question ·{" "}
                {expiresLabel(battle.expires_at)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="lime"
                className="min-h-12 flex-1 uppercase tracking-wider"
                disabled={busy !== null}
                onClick={acceptBattle}
              >
                <Check className="mr-1 h-4 w-4" />
                Accepter
              </Button>
              <Button
                variant="outline"
                className="min-h-12 flex-1 uppercase tracking-wider"
                disabled={busy !== null}
                onClick={declineBattle}
              >
                <X className="mr-1 h-4 w-4" />
                Refuser
              </Button>
            </div>
          </StickerCard>
        )
      ) : null}

      {/* ------------------------------------------------ LOBBY */}
      {battle.status === "lobby" ? (
        <StickerCard className="space-y-5 p-6">
          <h1 className="font-display text-2xl font-extrabold text-ink">
            Salle d&apos;attente
          </h1>
          <ul className="space-y-3">
            <LobbyRow
              player={me}
              label="Toi"
              online
              ready={Boolean(myParticipant?.is_ready)}
            />
            <LobbyRow
              player={opponent}
              label={opponent.pseudo}
              online={!presenceSynced || opponentPresent}
              ready={Boolean(oppParticipant?.is_ready)}
            />
          </ul>
          {bothReady ? (
            <p className="text-center font-mono text-sm font-bold text-teal">
              Les deux sont prêts — lancement…
            </p>
          ) : (
            <Button
              variant="pink"
              className="min-h-12 w-full uppercase tracking-wider"
              disabled={Boolean(myParticipant?.is_ready) || busy !== null}
              onClick={setReady}
            >
              {myParticipant?.is_ready ? "En attente de l'adversaire…" : "Je suis prêt !"}
            </Button>
          )}
        </StickerCard>
      ) : null}

      {/* ------------------------------------------------ ACTIVE */}
      {battle.status === "active" ? (
        <>
          {/* Adversaire déconnecté → bannière + forfait après 30 s (spec §3.3) */}
          {presenceSynced && !opponentPresent ? (
            <div
              role="alert"
              className="space-y-3 rounded-2xl border-2 border-ink bg-white px-4 py-3 shadow-stkr-sm"
            >
              <div className="flex items-center gap-3">
                <WifiOff className="h-5 w-5 shrink-0 text-coral" aria-hidden />
                <p className="text-sm font-bold text-ink">
                  {opponent.pseudo} est déconnecté·e — on attend son retour…
                </p>
              </div>
              {forfeitReadyInMs !== null && forfeitReadyInMs <= 0 ? (
                <Button
                  variant="pink"
                  size="sm"
                  className="w-full uppercase tracking-wider"
                  disabled={busy !== null}
                  onClick={claimForfeit}
                >
                  <Flag className="mr-1 h-4 w-4" />
                  Réclamer la victoire
                </Button>
              ) : forfeitReadyInMs !== null ? (
                <p className="font-mono text-xs text-mute">
                  Victoire par forfait possible dans{" "}
                  {Math.ceil(forfeitReadyInMs / 1000)} s
                </p>
              ) : null}
            </div>
          ) : null}

          {phase.kind === "countdown" ? (
            <CountdownCard reducedMotion={reducedMotion} />
          ) : null}

          {phase.kind === "interstitial" ? (
            <StickerCard className="space-y-3 p-6 text-center">
              <p className="eyebrow tracking-[0.16em] text-pink">Scores du round</p>
              <p className="font-display text-3xl font-extrabold text-ink">
                {myParticipant?.score ?? 0} — {oppParticipant?.score ?? 0}
              </p>
              <p className="font-mono text-sm text-mute">
                Round {roundNo}/{battle.rounds_total} arrive…
              </p>
            </StickerCard>
          ) : null}

          {phase.kind === "question" ? (
            <StickerCard className="space-y-5 p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="min-w-0 flex-1 font-display text-xl font-extrabold leading-snug text-ink">
                  {typeof payload?.question === "string" && payload.question
                    ? payload.question
                    : "En attente de la question…"}
                </h2>
                <TimerRing
                  remainingMs={remainingMs ?? 0}
                  totalMs={BATTLE_ROUND_SECONDS * 1000}
                  reduced={reducedMotion}
                />
              </div>

              <div className="grid grid-cols-1 gap-3">
                {options.map((option, index) => {
                  const selected = myAnswerIndex === index
                  const locked = myAnswerIndex !== null || timeUp
                  return (
                    <button
                      key={index}
                      type="button"
                      disabled={locked && !selected}
                      onClick={() => submitAnswer(index)}
                      className={cn(
                        "min-h-12 rounded-xl border-2 border-ink px-4 py-3 text-left font-semibold shadow-stkr-sm transition-all",
                        selected
                          ? "bg-ink text-paper"
                          : "bg-white text-ink hover:-translate-x-0.5 hover:-translate-y-0.5 motion-reduce:translate-x-0 motion-reduce:translate-y-0",
                        locked && !selected && "opacity-50",
                      )}
                    >
                      <span className="mr-2 font-mono text-xs font-bold" aria-hidden>
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </button>
                  )
                })}
              </div>

              {/* État mi-round — jamais de verdict avant la clôture (spec §3.2) */}
              <div className="border-t-2 border-ink/10 pt-3">
                {timeUp && myAnswerIndex === null ? (
                  <p className="font-mono text-sm font-bold text-coral">Temps écoulé !</p>
                ) : myAnswerIndex !== null ? (
                  <p className="font-mono text-sm text-mute">
                    Réponse enregistrée —{" "}
                    {oppParticipant?.answered_current
                      ? "l'adversaire a répondu aussi. Résultats du round imminents…"
                      : "en attente de l'adversaire…"}
                  </p>
                ) : oppParticipant?.answered_current ? (
                  <p className="font-mono text-sm text-mute">
                    {opponent.pseudo} a répondu — à toi de jouer !
                  </p>
                ) : (
                  <p className="font-mono text-xs text-mute">
                    Les scores tombent à la fin du round.
                  </p>
                )}
              </div>
            </StickerCard>
          ) : null}

          {phase.kind === "idle" ? (
            <StickerCard className="p-6 text-center">
              <p className="font-mono text-sm text-mute">Synchronisation du round…</p>
            </StickerCard>
          ) : null}

          {/* Réactions — set fermé de 6, throttle UI, compteur discret, mute local */}
          {reactionsAvailable ? (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {BATTLE_REACTION_EMOJIS.map((emoji) => {
                const count = reactionCounts[emoji] ?? 0
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => sendReaction(emoji)}
                    disabled={reactionCooldown}
                    aria-label={`Envoyer la réaction ${emoji}`}
                    className={cn(
                      "relative flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-white text-xl shadow-stkr-sm transition-transform",
                      "hover:-translate-y-0.5 motion-reduce:translate-y-0 disabled:opacity-50",
                    )}
                  >
                    {emoji}
                    {count > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full border border-ink bg-paper px-1 font-mono text-[9px] font-bold text-ink">
                        {count}
                      </span>
                    ) : null}
                  </button>
                )
              })}
              <button
                type="button"
                onClick={() => setReactionsMuted((v) => !v)}
                aria-pressed={reactionsMuted}
                aria-label={
                  reactionsMuted ? "Réactiver les réactions" : "Couper les réactions"
                }
                title={reactionsMuted ? "Réactiver les réactions" : "Couper les réactions"}
                className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-white shadow-stkr-sm"
              >
                {reactionsMuted ? (
                  <BellOff className="h-5 w-5 text-mute" aria-hidden />
                ) : (
                  <Bell className="h-5 w-5 text-ink" aria-hidden />
                )}
              </button>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ------------------------------------------------ RESOLVED */}
      {battle.status === "resolved" ? (
        <FinalCard
          battle={battle}
          me={me}
          opponent={opponent}
          myParticipant={myParticipant}
          oppParticipant={oppParticipant}
          busy={busy}
          onRematch={rematch}
        />
      ) : null}

      {/* ------------------------------------------------ CANCELLED / EXPIRED */}
      {battle.status === "cancelled" || battle.status === "expired" ? (
        <StickerCard className="space-y-4 p-6 text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink">
            {battle.status === "cancelled" ? "Battle refusée" : "Battle expirée"}
          </h1>
          <p className="text-sm text-mute">
            {battle.status === "cancelled"
              ? "Cette invitation a été refusée. Pas de rancune !"
              : "Cette battle est restée sans suite — elle a expiré sans XP."}
          </p>
          <Button variant="pink" asChild>
            <Link href="/teen/battles">Retour aux battles</Link>
          </Button>
        </StickerCard>
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function PlayerSide({
  player,
  label,
  score,
  online,
  answered,
  align = "left",
}: {
  player: BattlePlayer
  label: string
  score: number
  online: boolean
  answered: boolean
  align?: "left" | "right"
}) {
  const initial = (player.pseudo || "?").trim().charAt(0).toUpperCase() || "?"
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2",
        align === "right" && "flex-row-reverse text-right",
      )}
    >
      <div className="relative shrink-0">
        <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-paper font-display text-base font-extrabold text-ink">
          {initial}
        </div>
        <span
          aria-hidden
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink",
            online ? "bg-lime" : "bg-coral",
          )}
          title={online ? "En ligne" : "Hors ligne"}
        />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold text-ink">{label}</p>
        <p className="font-mono text-lg font-extrabold text-ink">{score}</p>
        {answered ? (
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-teal">
            a répondu
          </p>
        ) : null}
      </div>
    </div>
  )
}

function LobbyRow({
  player,
  label,
  online,
  ready,
}: {
  player: BattlePlayer
  label: string
  online: boolean
  ready: boolean
}) {
  const initial = (player.pseudo || "?").trim().charAt(0).toUpperCase() || "?"
  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border-2 border-ink bg-white px-3 py-2 shadow-stkr-sm">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative shrink-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-ink bg-paper font-display font-extrabold text-ink">
            {initial}
          </div>
          <span
            aria-hidden
            className={cn(
              "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-ink",
              online ? "bg-lime" : "bg-coral",
            )}
          />
        </div>
        <div className="min-w-0">
          <p className="truncate font-display font-bold text-ink">{label}</p>
          <p className="font-mono text-xs text-mute">Niveau {player.level}</p>
        </div>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full border-2 border-ink px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider",
          ready ? "bg-lime text-ink" : "bg-white text-mute",
        )}
      >
        {ready ? "Prêt" : "Pas prêt"}
      </span>
    </li>
  )
}

/** Countdown 3-2-1 local (1,8 s — sous le plafond +3 s de la fenêtre §3.4-2). */
function CountdownCard({ reducedMotion }: { reducedMotion: boolean }) {
  const [tick, setTick] = useState(3)
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => Math.max(1, t - 1)), COUNTDOWN_MS / 3)
    return () => clearInterval(iv)
  }, [])
  return (
    <StickerCard className="p-10 text-center">
      <p className="eyebrow tracking-[0.16em] text-pink">C&apos;est parti</p>
      <p
        key={tick}
        className={cn(
          "font-display text-7xl font-extrabold text-ink",
          !reducedMotion && "animate-in zoom-in duration-200",
        )}
        aria-live="polite"
      >
        {tick}
      </p>
    </StickerCard>
  )
}

/** Chrono circulaire 15 s — cosmétique : la validité est tranchée serveur. */
function TimerRing({
  remainingMs,
  totalMs,
  reduced,
}: {
  remainingMs: number
  totalMs: number
  reduced: boolean
}) {
  const seconds = Math.ceil(remainingMs / 1000)
  const frac = Math.max(0, Math.min(1, remainingMs / totalMs))
  const radius = 26
  const circumference = 2 * Math.PI * radius
  return (
    <div
      className="relative h-16 w-16 shrink-0"
      role="timer"
      aria-label={`${seconds} secondes restantes`}
    >
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={radius} fill="none" strokeWidth="6" className="stroke-ink/10" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - frac)}
          className={cn(
            seconds <= 5 ? "stroke-coral" : "stroke-teal",
            !reduced && "transition-[stroke-dashoffset] duration-150 ease-linear",
          )}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xl font-extrabold text-ink">
        {seconds}
      </span>
    </div>
  )
}

function FinalCard({
  battle,
  me,
  opponent,
  myParticipant,
  oppParticipant,
  busy,
  onRematch,
}: {
  battle: BattleRow
  me: BattlePlayer
  opponent: BattlePlayer
  myParticipant: BattleParticipantRow | undefined
  oppParticipant: BattleParticipantRow | undefined
  busy: string | null
  onRematch: () => void
}) {
  const won = battle.winner_id === me.id
  const draw = Boolean(battle.is_draw)
  const forfeit = battle.resolution === "forfeit"
  const xp = myParticipant?.xp_awarded ?? 0

  const verdict = draw
    ? "Match nul !"
    : won
      ? forfeit
        ? "Victoire par forfait 👑"
        : "Victoire 👑"
      : forfeit
        ? "Défaite par forfait"
        : "Défaite"

  return (
    <div className="space-y-5">
      <StickerCard className="space-y-5 p-6 text-center">
        <p className="eyebrow tracking-[0.16em] text-pink">Battle terminée</p>
        <h1
          className={cn(
            "font-display text-4xl font-extrabold tracking-tight",
            draw ? "text-gold" : won ? "text-ink" : "text-mute",
          )}
        >
          {verdict}
        </h1>
        <p className="font-display text-3xl font-extrabold text-ink">
          {myParticipant?.score ?? 0} — {oppParticipant?.score ?? 0}
        </p>
        <p className="text-sm text-mute">
          Toi contre {opponent.pseudo} · {battle.rounds_total} rounds
        </p>

        {xp > 0 ? (
          <p className="inline-flex items-center justify-center rounded-full border-2 border-ink bg-white px-4 py-1.5 font-mono text-sm font-bold text-gold shadow-stkr-sm">
            +{xp} XP
          </p>
        ) : (
          <p className="font-mono text-xs text-mute">
            {battle.resolution === "forfeit" && !won
              ? "Abandon — pas d'XP pour cette battle."
              : "Mode entraînement — plafond quotidien atteint, 0 XP cette fois."}
          </p>
        )}

        <div className="flex flex-col items-stretch gap-2 sm:flex-row">
          <Button
            variant="pink"
            className="min-h-12 flex-1 uppercase tracking-wider"
            disabled={busy !== null}
            onClick={onRematch}
          >
            <Swords className="mr-1 h-4 w-4" />
            Revanche
          </Button>
          <Button variant="outline" className="min-h-12 flex-1 uppercase tracking-wider" asChild>
            <Link href="/teen/battles">Retour aux battles</Link>
          </Button>
        </div>
        <p className="font-mono text-[10px] text-mute">
          La revanche compte dans tes limites quotidiennes de battles.
        </p>
      </StickerCard>

      {!won && !draw ? (
        <NivCoach
          mood="calm"
          message="Pas grave — chaque battle t'entraîne. Un quiz pour réviser, puis revanche ?"
        />
      ) : null}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function expiresLabel(iso: string | null): string {
  if (!iso) return "invitation valable 24 h"
  const ms = Date.parse(iso) - Date.now()
  if (Number.isNaN(ms) || ms <= 0) return "invitation expirée"
  const hours = Math.ceil(ms / 3_600_000)
  if (hours <= 1) return "expire dans moins d'une heure"
  return `expire dans ${hours} h`
}
