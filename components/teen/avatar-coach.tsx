/**
 * AvatarCoach v1 — Whitepaper §8 retention centerpiece.
 *
 * Server component: fetches the teen's avatar (name/color/skin/mood) and the
 * latest avatar_message, then renders the greeting via the client component.
 *
 * Empty-safe: if no avatars row exists, falls back to a default "Niv" coach
 * with neutral mood. No LLM calls here — this surface only RENDERS messages
 * that already exist in the DB (lib/ai/* writes them). V1 = read-only.
 *
 * V1 contract:
 *  - Greet the teen by name
 *  - Show one CTA (Quiz du jour OR active mission)
 *  - Reflect mood via gradient color
 *  - No chat loop, no live updates
 *
 * Wave 3 / TICKET-012 (Q7) — extension:
 *  - Query `recommend_for_teen('quiz', 1)` and, if the teen has not already
 *    completed a quiz today, expose the top suggestion as `dailyQuiz` so the
 *    client renders a "Quiz du jour : <title>" CTA in addition to the
 *    existing primary CTA. Empty-safe: if no candidate, render baseline.
 *
 * Coordination note (EXECUTION_PLAN.md): PC4 (TICKET-015 chores hook) and U6
 * (TICKET-041 chat v2) will extend this same file AFTER Q7 by adding their
 * own distinct, additive sections. Do not collapse the prop surface.
 *
 * Wave 3 / TICKET-015 (PC4) — extension:
 *  - After Q7's quiz teaser, render a SECOND server-side section: a chore
 *    nudge CTA derived from `getChoreNudge(teenId)` ("Tâche à finir : <title>"
 *    → /teen/chores). Empty-safe: if the helper returns null (no open chore
 *    for the teen), this section renders nothing and the layout collapses.
 *
 * Wave 3 / TICKET-041 (U6) — RESERVED:
 *  - U6 will own the chat-v2 surface and may add a third section / migrate
 *    the existing CTAs into a richer dialog inside avatar-coach-client. Keep
 *    PC4's chore section additive (a sibling of <AvatarCoachClient/>) so U6
 *    can safely refactor the client without touching this file.
 */

import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import { AvatarCoachClient } from "./avatar-coach-client"
import { getChoreNudge, type ChoreNudge } from "@/lib/server/unified-quest-engine"

type AvatarRow = {
  teen_id: string
  name: string | null
  color: string | null
  skin: string | null
  mood: string | null
  last_message_at: string | null
}

type AvatarMessageRow = {
  id: string
  teen_id: string
  message_text: string | null
  mood: string | null
  suggested_quest_id: string | null
  displayed_at: string | null
  dismissed_at: string | null
}

/** Shape of a single row returned by `recommend_for_teen` RPC (json_build_object). */
type RecommendRow = {
  id: string
  content_type: string
  score: number
  reason: string
}

/** Hydrated quiz teaser passed to the client. */
export type DailyQuizTeaser = { id: string; title: string }

export interface AvatarCoachProps {
  /** Teen's display name as a fallback if avatars.name is null. */
  fallbackName?: string
  /** Render compact (inline) variant — useful when embedded in a card. */
  compact?: boolean
  className?: string
}

export async function AvatarCoach({
  fallbackName,
  compact = false,
  className,
}: AvatarCoachProps) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // No session → render nothing. Layout already gates teen routes upstream.
  if (!user) return null

  // Compute "today" as the start of the current local server day (UTC). The
  // recommender already enforces a 7-day no-repeat invariant, so this is just
  // a belt-and-braces check: if the teen already completed (passed or not) a
  // quiz today, suppress the teaser so we do not nag them with another one.
  const todayStartIso = new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString()

  const [
    { data: avatar },
    { data: latest },
    { data: recoData, error: recoError },
    { data: todayAttempt },
  ] = await Promise.all([
    supabase
      .from("avatars")
      .select("teen_id, name, color, skin, mood, last_message_at")
      .eq("teen_id", user.id)
      .maybeSingle<AvatarRow>(),
    supabase
      .from("avatar_messages")
      .select("id, teen_id, message_text, mood, suggested_quest_id, displayed_at, dismissed_at")
      .eq("teen_id", user.id)
      .is("dismissed_at", null)
      .order("displayed_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle<AvatarMessageRow>(),
    supabase.rpc("recommend_for_teen", {
      p_teen_id: user.id,
      p_content_type: "quiz",
      p_n: 1,
    }),
    supabase
      .from("quiz_attempts")
      .select("id, completed_at")
      .eq("teen_id", user.id)
      .gte("completed_at", todayStartIso)
      .limit(1)
      .maybeSingle<{ id: string; completed_at: string | null }>(),
  ])

  // Resolve display fields with sensible defaults.
  const name = (avatar?.name || "Niv").trim() || "Niv"
  const color = avatar?.color || "#A78BFA" // gen-z lavender default
  const skin = avatar?.skin || "default"
  const mood = (latest?.mood || avatar?.mood || "neutral").toLowerCase()

  // Greeting message. Prefer the DB-written message if present.
  const teenFirstName =
    fallbackName?.split(" ")[0] ||
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ||
    "champion"

  const message =
    latest?.message_text?.trim() ||
    defaultGreeting(teenFirstName, mood)

  // CTA — wire to the suggested quest if we have one, else the daily quiz.
  const cta = latest?.suggested_quest_id
    ? { label: "Faire la quête du jour", href: `/teen/quests` }
    : { label: "Quiz du jour", href: "/teen/quiz" }

  // TICKET-012 (Q7) — Daily quiz teaser. Best-effort: any failure path leaves
  // dailyQuiz=null and the surface degrades to the existing greeting CTA.
  const dailyQuiz = await resolveDailyQuiz(supabase, recoData, recoError, todayAttempt?.id ?? null)

  // TICKET-015 (PC4) — chore nudge. Best-effort: returns null if no open chore
  // is assigned to this teen, in which case the section is omitted entirely.
  let choreNudge: ChoreNudge | null = null
  try {
    choreNudge = await getChoreNudge(user.id)
  } catch (err) {
    console.warn("[AvatarCoach] getChoreNudge error:", err)
  }

  return (
    <>
      <AvatarCoachClient
        coachName={name}
        teenFirstName={teenFirstName}
        message={message}
        mood={mood}
        color={color}
        skin={skin}
        cta={cta}
        messageId={latest?.id ?? null}
        dailyQuiz={dailyQuiz}
        compact={compact}
        className={className}
      />
      {/* TICKET-015 (PC4) — chore nudge section. Sibling of the coach card so
          U6 (TICKET-041) can refactor avatar-coach-client without touching it. */}
      {choreNudge ? (
        <ChoreNudgeSection nudge={choreNudge} compact={compact} className={className} />
      ) : null}
    </>
  )
}

/**
 * Server-rendered chore CTA. No interactivity, so kept inline rather than
 * shipped to avatar-coach-client (which U6 owns).
 */
function ChoreNudgeSection({
  nudge,
  compact,
  className,
}: {
  nudge: ChoreNudge
  compact: boolean
  className?: string
}) {
  return (
    <section
      aria-label="Corvée à finir"
      className={cn(
        "mt-2 sm:mt-3 w-full overflow-hidden rounded-2xl border border-emerald-400/20",
        "bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent",
        "backdrop-blur-md",
        compact ? "p-3" : "p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className={cn(
            "flex shrink-0 items-center justify-center rounded-full ring-2 ring-emerald-300/30",
            compact ? "h-10 w-10 text-lg" : "h-12 w-12 text-2xl",
          )}
          style={{
            background:
              "radial-gradient(circle at 30% 30%, rgba(52,211,153,0.85) 0%, rgba(16,185,129,0.45) 100%)",
          }}
        >
          <span aria-hidden>🧹</span>
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-emerald-300/80">
            Tâche à finir
          </span>
          <p
            className={cn(
              "mt-1 truncate text-white",
              compact ? "text-sm font-medium" : "text-base sm:text-lg font-semibold",
            )}
          >
            {nudge.title}
          </p>
          <p className="mt-0.5 text-xs text-white/60">
            {nudge.reward_dh > 0 ? `${nudge.reward_dh} DH` : null}
            {nudge.reward_dh > 0 && nudge.reward_xp > 0 ? " · " : null}
            {nudge.reward_xp > 0 ? `${nudge.reward_xp} XP` : null}
            {nudge.remaining > 1 ? ` · ${nudge.remaining} restantes` : null}
          </p>
          <div className="mt-3">
            <Link
              href="/teen/chores"
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs sm:text-sm font-bold",
                "bg-emerald-400 text-emerald-950 hover:bg-emerald-300 transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200",
              )}
            >
              Finir maintenant
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * Resolve the top quiz recommendation into a `{ id, title }` teaser, or null.
 *
 * Returns null when:
 *  - The RPC errored or returned no rows.
 *  - The teen already completed (any) quiz today.
 *  - The hydrated quiz row is missing/inactive (e.g. unpublished after RPC).
 */
async function resolveDailyQuiz(
  supabase: Awaited<ReturnType<typeof createClient>>,
  recoData: unknown,
  recoError: { message?: string } | null,
  alreadyCompletedTodayId: string | null,
): Promise<DailyQuizTeaser | null> {
  if (alreadyCompletedTodayId) return null
  if (recoError) {
    console.warn("[AvatarCoach] recommend_for_teen quiz error:", recoError.message)
    return null
  }
  const rows = parseRecommendRows(recoData)
  const top = rows[0]
  if (!top?.id) return null

  const { data: quiz } = await supabase
    .from("educational_quizzes")
    .select("id, title, is_active")
    .eq("id", top.id)
    .eq("is_active", true)
    .maybeSingle<{ id: string; title: string | null; is_active: boolean | null }>()

  if (!quiz?.id || !quiz.title) return null
  return { id: quiz.id, title: quiz.title }
}

/**
 * The RPC returns SETOF JSON. supabase-js may surface that as an array of
 * objects OR an array of stringified JSON depending on driver/version. Be
 * defensive and accept both, mirroring `app/api/teen/recommendations/route.ts`.
 */
function parseRecommendRows(data: unknown): RecommendRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (typeof row === "string") {
        try {
          return JSON.parse(row) as RecommendRow
        } catch {
          return null
        }
      }
      if (row && typeof row === "object" && "id" in (row as Record<string, unknown>)) {
        return row as RecommendRow
      }
      return null
    })
    .filter((r): r is RecommendRow => !!r && typeof r.id === "string")
}

/** Hard-coded fallback greetings keyed on mood. Used when no avatar_message row. */
function defaultGreeting(firstName: string, mood: string): string {
  switch (mood) {
    case "happy":
    case "celebrating":
      return `Yo ${firstName} ! T'es en feu aujourd'hui — on continue ?`
    case "sad":
    case "tired":
      return `Coucou ${firstName}. Petite session douce aujourd'hui ?`
    case "focused":
      return `${firstName}, prêt à enchaîner ? Une quête t'attend.`
    default:
      return `Salut ${firstName} ! Prêt pour ton défi du jour ?`
  }
}

