/**
 * Memory — sets d'emojis (SPEC-G4 §7.2 / §5.2)
 * ============================================
 *
 * Contenu du Memory v1 : des sets d'emojis DÉFINIS EN DUR dans le code —
 * pas de DB, pas d'images uploadées, zéro risque de contenu, zéro
 * modération requise (spec §5.2). 8 emojis par set = 8 paires (grille 4×4).
 */

export interface MemorySet {
  id: string
  emojis: readonly string[]
}

export const MEMORY_SETS: readonly MemorySet[] = [
  { id: "animaux", emojis: ["🐼", "🦊", "🐢", "🦁", "🐙", "🦋", "🐳", "🦉"] },
  { id: "food", emojis: ["🍕", "🍩", "🥑", "🍓", "🌮", "🍇", "🧁", "🍉"] },
  { id: "sport", emojis: ["⚽", "🏀", "🎾", "🏓", "🛹", "🚴", "🏊", "🥋"] },
  { id: "espace", emojis: ["🚀", "🪐", "⭐", "🌙", "☄️", "🛰️", "🌍", "👽"] },
] as const

export function getMemorySet(id: string | null | undefined): MemorySet {
  return MEMORY_SETS.find((s) => s.id === id) ?? MEMORY_SETS[0]
}
