/**
 * #348 (tokenomics-coherence) — la courbe de niveau UI doit être IDENTIQUE à la
 * formule appliquée en base par add_xp_to_user / user_xp.current_level
 * (000_base_tables.sql:345 : on monte de niveau tant que
 *  total_xp >= (level * (level + 1) / 2) * 100).
 */
import { describe, expect, it } from "vitest"
import {
  MAX_LEVEL,
  totalXpForLevel,
  xpToLevelUp,
  levelProgressForXp,
} from "@/lib/gamification/level-curve"

/** Réplique fidèle de la logique SQL backend, sans dépendre de la lib. */
function backendLevel(totalXp: number): number {
  let level = 1
  while (level < MAX_LEVEL && totalXp >= (level * (level + 1) / 2) * 100) {
    level += 1
  }
  return level
}

describe("level-curve aligned on backend (#348)", () => {
  it("totalXpForLevel matches the backend threshold ((N-1)*N/2)*100", () => {
    expect(totalXpForLevel(1)).toBe(0)
    expect(totalXpForLevel(2)).toBe(100)
    expect(totalXpForLevel(3)).toBe(300)
    expect(totalXpForLevel(4)).toBe(600)
    expect(totalXpForLevel(5)).toBe(1000)
    expect(totalXpForLevel(6)).toBe(1500)
  })

  it("xpToLevelUp(L) equals 100*L", () => {
    expect(xpToLevelUp(1)).toBe(100)
    expect(xpToLevelUp(2)).toBe(200)
    expect(xpToLevelUp(5)).toBe(500)
  })

  it("the increment sums back to the cumulative threshold", () => {
    for (let n = 1; n <= 50; n++) {
      let sum = 0
      for (let l = 1; l < n; l++) sum += xpToLevelUp(l)
      expect(sum).toBe(totalXpForLevel(n))
    }
  })

  it("levelProgressForXp(level) == backend level for a wide XP range", () => {
    for (let xp = 0; xp <= 200_000; xp += 137) {
      expect(levelProgressForXp(xp).level).toBe(backendLevel(xp))
    }
  })

  it("exact threshold boundaries", () => {
    expect(levelProgressForXp(99).level).toBe(1)
    expect(levelProgressForXp(100).level).toBe(2)
    expect(levelProgressForXp(299).level).toBe(2)
    expect(levelProgressForXp(300).level).toBe(3)
    expect(levelProgressForXp(999).level).toBe(4)
    expect(levelProgressForXp(1000).level).toBe(5)
  })
})
