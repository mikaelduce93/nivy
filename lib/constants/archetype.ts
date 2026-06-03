/**
 * V11 #303 — single source of truth for the teen archetype + learning style.
 *
 * Before this, the enum diverged: the quiz + pre-auth capture + recommender used
 * {creator, explorer, competitor, social}, while the learning-style route
 * derived {leader, explorer, creator, socializer} — two of which (leader,
 * socializer) the rest of the app never understood. This unifies on the
 * recommender's canonical 4 and provides the canonical style→archetype mapping.
 */
export const ARCHETYPES = ["creator", "explorer", "competitor", "social"] as const
export type Archetype = (typeof ARCHETYPES)[number]

export function isArchetype(v: unknown): v is Archetype {
  return typeof v === "string" && (ARCHETYPES as readonly string[]).includes(v)
}

/** French labels for prompts / UI. */
export const ARCHETYPE_LABEL_FR: Record<Archetype, string> = {
  creator: "créateur",
  explorer: "explorateur",
  competitor: "compétiteur",
  social: "social",
}

export const LEARNING_STYLES = ["visual", "auditory", "kinesthetic", "reading"] as const
export type LearningStyle = (typeof LEARNING_STYLES)[number]

export function isLearningStyle(v: unknown): v is LearningStyle {
  return typeof v === "string" && (LEARNING_STYLES as readonly string[]).includes(v)
}

export const LEARNING_STYLE_LABEL_FR: Record<LearningStyle, string> = {
  visual: "visuel",
  auditory: "auditif",
  kinesthetic: "kinesthésique (par la pratique)",
  reading: "lecture / écriture",
}

/**
 * Canonical style→archetype derivation (4-value enum). Used by the
 * learning-style onboarding route when the teen didn't pick an archetype
 * explicitly. Biased by the dominant + secondary style signal.
 */
export function deriveArchetypeFromStyle(
  style: LearningStyle,
  answers: LearningStyle[],
): Archetype {
  const counts: Record<LearningStyle, number> = {
    visual: 0,
    auditory: 0,
    kinesthetic: 0,
    reading: 0,
  }
  for (const a of answers) counts[a] += 1

  if (style === "kinesthetic") return "competitor" // pratique, défi, action
  if (style === "auditory") return "social" // discussion, collaboration
  if (style === "reading") return "creator" // texte, imagination
  // visual: tie-break by secondary signal
  if (counts.kinesthetic >= counts.reading && counts.kinesthetic >= counts.auditory) {
    return "explorer"
  }
  if (counts.reading >= counts.auditory) return "creator"
  return "social"
}
