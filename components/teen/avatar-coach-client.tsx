"use client"

/**
 * AvatarCoach v1 — client renderer.
 *
 * Pure visual + tiny dismiss interaction. No data fetching here.
 * Animations: framer-motion is already a hard dep across teen/dashboard,
 * but we keep this component lightweight (no framer) to avoid the bundle
 * cost on the dashboard root. CSS transitions only.
 *
 * Wave 3 / TICKET-041 (U6) — additive chat surface (v2):
 *  - A collapsible "Demander à <coach>" panel below the existing greeting +
 *    Q7 quiz teaser (and PC4 chores hook). Defers to the new endpoint
 *    `POST /api/teen/avatar-coach`. Capped at 5 turns/day server-side; the
 *    client mirrors the remaining counter returned by the API.
 *  - Opt-in via `chatEnabled` (defaults to true so the Wave 3 surface
 *    lights up automatically). The greeting / CTA / dismiss surface above
 *    is left untouched — Q7 and PC4 own that area.
 */

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

/**
 * Daily quiz teaser surfaced by the server component when the recommender
 * returns a fresh suggestion AND the teen has not completed a quiz today.
 * TICKET-012 (Q7).
 */
export interface DailyQuizTeaser {
  id: string
  title: string
}

interface AvatarCoachClientProps {
  coachName: string
  teenFirstName: string
  message: string
  mood: string
  color: string
  skin: string
  cta: { label: string; href: string }
  messageId: string | null
  /**
   * Optional quiz teaser. When present, we render an additional CTA below
   * the primary action: "Quiz du jour : <title>" → /teen/quiz/[id].
   * When null/undefined we fall back to the existing greeting + CTA only.
   */
  dailyQuiz?: DailyQuizTeaser | null
  /**
   * TICKET-041 (U6) — opt-in chat surface (v2).
   * When true (default) we render a collapsible "Demander à <coach>"
   * panel that talks to /api/teen/avatar-coach. Pass `false` for legacy
   * callers that want the v1 read-only render.
   */
  chatEnabled?: boolean
  compact?: boolean
  className?: string
}

const MOOD_EMOJI: Record<string, string> = {
  happy: "😄",
  celebrating: "🎉",
  sad: "🥺",
  tired: "😴",
  focused: "🎯",
  neutral: "🐼",
}

export function AvatarCoachClient({
  coachName,
  message,
  mood,
  color,
  cta,
  messageId,
  dailyQuiz,
  chatEnabled = true,
  compact = false,
  className,
}: AvatarCoachClientProps) {
  const router = useRouter()
  const [dismissing, setDismissing] = React.useState(false)
  const [dismissed, setDismissed] = React.useState(false)

  const moodEmoji = MOOD_EMOJI[mood] || MOOD_EMOJI.neutral

  // Build a soft gradient from the avatar color so the surface reflects mood.
  const gradient = React.useMemo(
    () =>
      `linear-gradient(135deg, ${withAlpha(color, 0.18)} 0%, ${withAlpha(
        color,
        0.04,
      )} 60%, transparent 100%)`,
    [color],
  )

  const handleDismiss = React.useCallback(async () => {
    if (!messageId || dismissing) return
    setDismissing(true)
    try {
      await fetch("/api/teen/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", messageId }),
      })
      setDismissed(true)
      // Refresh server data so the next message (if any) shows up.
      router.refresh()
    } catch {
      // Best-effort. Keep the UI usable on failure.
      setDismissing(false)
    }
  }, [messageId, dismissing, router])

  if (dismissed) return null

  return (
    <section
      aria-label={`Message de ${coachName}`}
      className={cn(
        "relative w-full overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-md",
        "transition-all duration-300",
        compact ? "p-3 sm:p-4" : "p-4 sm:p-5 md:p-6",
        className,
      )}
      style={{ backgroundImage: gradient }}
    >
      {/* Decorative glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-40"
        style={{ background: color }}
      />

      <div className="relative flex items-start gap-3 sm:gap-4">
        {/* Avatar disc */}
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/15 shadow-lg",
            compact ? "h-12 w-12 text-2xl" : "h-14 w-14 sm:h-16 sm:w-16 text-3xl sm:text-4xl",
          )}
          style={{
            background: `radial-gradient(circle at 30% 30%, ${withAlpha(color, 0.9)} 0%, ${withAlpha(color, 0.5)} 100%)`,
          }}
        >
          <span aria-hidden>{moodEmoji}</span>
        </div>

        {/* Message + CTA */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-white/60">
              {coachName}
            </span>
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: color }}
              aria-hidden
            />
            <span className="text-[10px] sm:text-xs font-medium text-white/40 capitalize">
              {mood}
            </span>
          </div>

          <p
            className={cn(
              "mt-1 text-white",
              compact ? "text-sm leading-snug" : "text-base sm:text-lg leading-snug font-medium",
            )}
          >
            {message}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={cta.href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold",
                "bg-white text-black hover:bg-white/90 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              )}
            >
              {cta.label}
              <span aria-hidden>→</span>
            </Link>

            {messageId ? (
              <button
                type="button"
                onClick={handleDismiss}
                disabled={dismissing}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-semibold",
                  "text-white/60 hover:text-white hover:bg-white/5 transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                {dismissing ? "..." : "Plus tard"}
              </button>
            ) : null}
          </div>

          {/*
            TICKET-012 (Q7) — Daily quiz teaser.
            Rendered only when the server resolved a recommendation and the
            teen has not completed a quiz today. Sits BELOW the primary CTA
            so the existing greeting/quest action stays the dominant choice.
          */}
          {dailyQuiz ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={`/teen/quiz/${dailyQuiz.id}`}
                aria-label={`Quiz du jour : ${dailyQuiz.title}`}
                data-testid="avatar-coach-daily-quiz"
                className={cn(
                  "inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5",
                  "text-[11px] sm:text-xs font-semibold",
                  "border border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors",
                )}
              >
                <span aria-hidden>✨</span>
                <span className="truncate">
                  Quiz du jour&nbsp;:{" "}
                  <span className="font-bold">{dailyQuiz.title}</span>
                </span>
                <span aria-hidden>→</span>
              </Link>
            </div>
          ) : null}

          {/*
            RESERVED — TICKET-015 (PC4): chores hook section.
            PC4 will append a chore teaser ("Maman a promis 100 DH pour 5
            vaisselles") here as a sibling block. Do NOT inline it into the
            quiz teaser above; keep separate sections.
          */}

          {/*
            TICKET-041 (U6) — AvatarCoach v2 chat surface.
            Collapsible "Demander à <coach>" panel. Disabled by passing
            chatEnabled={false}. Lazy-loaded — we only fetch history once
            the teen opens the panel.
          */}
          {chatEnabled ? (
            <AvatarCoachChat coachName={coachName} color={color} compact={compact} />
          ) : null}
        </div>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------------------
 *  TICKET-041 (U6) — chat panel
 *  --------------------------------------------------------------------- */

type ChatTurn = { role: "user" | "assistant"; content: string }

interface ChatState {
  open: boolean
  loadingHistory: boolean
  sending: boolean
  turns: ChatTurn[]
  remaining: number | null
  cap: number
  draft: string
  error: string | null
}

const MAX_INPUT_CHARS_CLIENT = 280

function AvatarCoachChat({
  coachName,
  color,
  compact,
}: {
  coachName: string
  color: string
  compact: boolean
}) {
  const [state, setState] = React.useState<ChatState>({
    open: false,
    loadingHistory: false,
    sending: false,
    turns: [],
    remaining: null,
    cap: 5,
    draft: "",
    error: null,
  })
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const loadHistory = React.useCallback(async () => {
    setState((s) => ({ ...s, loadingHistory: true, error: null }))
    try {
      const res = await fetch("/api/teen/avatar-coach", { method: "GET" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        history: ChatTurn[]
        remainingTurns: number
        cap: number
      }
      setState((s) => ({
        ...s,
        loadingHistory: false,
        turns: Array.isArray(data.history) ? data.history : [],
        remaining: typeof data.remainingTurns === "number" ? data.remainingTurns : null,
        cap: typeof data.cap === "number" ? data.cap : 5,
      }))
    } catch {
      setState((s) => ({
        ...s,
        loadingHistory: false,
        error: "Impossible de charger la conversation.",
      }))
    }
  }, [])

  const handleToggle = React.useCallback(() => {
    setState((s) => {
      const next = !s.open
      // First open → fetch history.
      if (next && s.turns.length === 0 && s.remaining === null) {
        // schedule async load after state flush
        queueMicrotask(loadHistory)
      }
      return { ...s, open: next, error: null }
    })
  }, [loadHistory])

  // Auto-scroll on new turns.
  React.useEffect(() => {
    if (!state.open) return
    const el = scrollerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [state.turns, state.open, state.sending])

  // Focus the input when the panel opens.
  React.useEffect(() => {
    if (state.open) inputRef.current?.focus()
  }, [state.open])

  const handleSend = React.useCallback(async () => {
    const draft = state.draft.trim()
    if (!draft || state.sending) return
    if (draft.length > MAX_INPUT_CHARS_CLIENT) {
      setState((s) => ({ ...s, error: "Message trop long (280 caractères max)." }))
      return
    }
    if (state.remaining === 0) {
      setState((s) => ({
        ...s,
        error: "Tu as atteint ta limite de 5 questions pour aujourd'hui.",
      }))
      return
    }

    // Optimistic teen turn.
    setState((s) => ({
      ...s,
      sending: true,
      error: null,
      draft: "",
      turns: [...s.turns, { role: "user", content: draft }],
    }))

    try {
      const res = await fetch("/api/teen/avatar-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: draft }),
      })
      const data = (await res.json().catch(() => null)) as {
        reply?: string
        remainingTurns?: number
        cap?: number
        error?: string
      } | null

      if (!res.ok) {
        if (res.status === 429) {
          setState((s) => ({
            ...s,
            sending: false,
            remaining: 0,
            error: "Tu as atteint ta limite de 5 questions pour aujourd'hui.",
          }))
          return
        }
        setState((s) => ({
          ...s,
          sending: false,
          error: data?.error || "Erreur lors de l'envoi.",
        }))
        return
      }

      setState((s) => ({
        ...s,
        sending: false,
        turns: [...s.turns, { role: "assistant", content: data?.reply || "..." }],
        remaining:
          typeof data?.remainingTurns === "number" ? data.remainingTurns : s.remaining,
        cap: typeof data?.cap === "number" ? data.cap : s.cap,
      }))
    } catch {
      setState((s) => ({
        ...s,
        sending: false,
        error: "Connexion perdue. Réessaie dans un instant.",
      }))
    }
  }, [state.draft, state.sending, state.remaining])

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        void handleSend()
      }
    },
    [handleSend],
  )

  const remainingLabel =
    state.remaining === null
      ? `${state.cap} max / jour`
      : state.remaining === 0
        ? "Limite atteinte"
        : `${state.remaining} restantes`

  return (
    <div className="mt-3 border-t border-white/10 pt-3" data-testid="avatar-coach-chat">
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={state.open}
        aria-controls="avatar-coach-chat-panel"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5",
          "text-[11px] sm:text-xs font-semibold",
          "border border-white/15 bg-white/5 text-white/90 hover:bg-white/10 hover:text-white",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 transition-colors",
        )}
      >
        <span aria-hidden>💬</span>
        <span>{state.open ? `Fermer la discussion` : `Demander à ${coachName}`}</span>
        <span aria-hidden className="text-white/40">·</span>
        <span className="text-white/50">{remainingLabel}</span>
      </button>

      {state.open ? (
        <div
          id="avatar-coach-chat-panel"
          role="region"
          aria-label={`Discussion avec ${coachName}`}
          className={cn(
            "mt-3 rounded-xl border border-white/10 bg-black/30 backdrop-blur-sm",
            compact ? "p-2" : "p-3",
          )}
        >
          {/* Transcript */}
          <div
            ref={scrollerRef}
            className={cn(
              "flex flex-col gap-2 overflow-y-auto",
              compact ? "max-h-40" : "max-h-56",
            )}
          >
            {state.loadingHistory ? (
              <p className="text-xs text-white/50">Chargement...</p>
            ) : state.turns.length === 0 ? (
              <p className="text-xs text-white/50">
                Pose une question à {coachName}. Pour les sujets sensibles
                (santé, famille, argent), parles-en plutôt à ton parent ou à
                ton mentor.
              </p>
            ) : (
              state.turns.map((t, i) => (
                <ChatBubble key={i} role={t.role} content={t.content} color={color} />
              ))
            )}
            {state.sending ? (
              <ChatBubble role="assistant" content="..." color={color} typing />
            ) : null}
          </div>

          {/* Composer */}
          <div className="mt-2 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              value={state.draft}
              onChange={(e) =>
                setState((s) => ({ ...s, draft: e.target.value, error: null }))
              }
              onKeyDown={handleKeyDown}
              maxLength={MAX_INPUT_CHARS_CLIENT}
              placeholder={`Écris ta question…`}
              disabled={state.sending || state.remaining === 0}
              aria-label={`Message pour ${coachName}`}
              className={cn(
                "min-w-0 flex-1 rounded-full bg-white/5 px-3 py-2 text-sm text-white",
                "placeholder:text-white/30 outline-none",
                "border border-white/10 focus:border-white/30 focus:bg-white/10",
                "disabled:opacity-50 transition-colors",
              )}
            />
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={
                state.sending ||
                state.draft.trim().length === 0 ||
                state.remaining === 0
              }
              className={cn(
                "rounded-full px-3 py-2 text-xs font-bold",
                "bg-white text-black hover:bg-white/90 transition-colors",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
              )}
            >
              {state.sending ? "..." : "Envoyer"}
            </button>
          </div>

          {state.error ? (
            <p className="mt-2 text-[11px] text-rose-300/90" role="alert">
              {state.error}
            </p>
          ) : null}
          <p className="mt-1 text-[10px] text-white/30">
            {state.draft.length}/{MAX_INPUT_CHARS_CLIENT}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ChatBubble({
  role,
  content,
  color,
  typing,
}: {
  role: "user" | "assistant"
  content: string
  color: string
  typing?: boolean
}) {
  const isUser = role === "user"
  return (
    <div
      className={cn(
        "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug",
        isUser
          ? "self-end bg-white text-black"
          : "self-start text-white border border-white/10",
      )}
      style={
        !isUser
          ? {
              background: `linear-gradient(135deg, ${withAlpha(color, 0.18)} 0%, rgba(255,255,255,0.04) 100%)`,
            }
          : undefined
      }
    >
      {typing ? <span className="opacity-60">...</span> : content}
    </div>
  )
}

/**
 * Apply alpha to a hex/rgb/named color. Falls back to the original color
 * if it can't be parsed (CSS will still render).
 */
function withAlpha(color: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha))
  if (color.startsWith("#")) {
    const hex = color.slice(1)
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex
    if (full.length === 6) {
      const r = parseInt(full.slice(0, 2), 16)
      const g = parseInt(full.slice(2, 4), 16)
      const b = parseInt(full.slice(4, 6), 16)
      return `rgba(${r}, ${g}, ${b}, ${a})`
    }
  }
  if (color.startsWith("rgb(")) {
    return color.replace("rgb(", "rgba(").replace(")", `, ${a})`)
  }
  // Named or unsupported — let CSS handle it; alpha can't be applied.
  return color
}
