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
 */

import { createClient } from "@/lib/supabase/server"
import { AvatarCoachClient } from "./avatar-coach-client"

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

  const [{ data: avatar }, { data: latest }] = await Promise.all([
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

  return (
    <AvatarCoachClient
      coachName={name}
      teenFirstName={teenFirstName}
      message={message}
      mood={mood}
      color={color}
      skin={skin}
      cta={cta}
      messageId={latest?.id ?? null}
      compact={compact}
      className={className}
    />
  )
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

