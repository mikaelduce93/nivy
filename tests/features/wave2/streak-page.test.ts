/**
 * Unit tests for /teen/streak Wave 2 data logic.
 * Tests the milestone unlocking logic and history processing
 * that the server component applies before passing props to StreakClient.
 */
import { describe, expect, it } from "vitest"

// ─── Milestone unlock logic (mirrors page.tsx) ──────────────────────────────
const MILESTONES = [
  { days: 3,   xpReward: 50,   badge: "🔥", title: "Démarrage" },
  { days: 7,   xpReward: 150,  badge: "💪", title: "En forme" },
  { days: 14,  xpReward: 300,  badge: "⚡", title: "Électrique" },
  { days: 30,  xpReward: 500,  badge: "🌟", title: "Étoile" },
  { days: 60,  xpReward: 1000, badge: "🏆", title: "Champion" },
  { days: 100, xpReward: 2000, badge: "👑", title: "Légende" },
]

function buildMilestones(currentStreak: number) {
  return MILESTONES.map((m) => ({ ...m, unlocked: currentStreak >= m.days }))
}

// ─── History processing (mirrors page.tsx) ──────────────────────────────────
function buildStreakHistory(activityRows: Array<{ activity_date: string; time?: number; xp_earned?: number }>) {
  return activityRows.map((day) => ({
    date: day.activity_date,
    completed: (day.time ?? 0) > 0 || (day.xp_earned ?? 0) > 0,
    xpEarned: day.xp_earned ?? 0,
  }))
}

// ─── Multiplier logic (mirrors page.tsx) ─────────────────────────────────────
function computeMultiplier(streak: number) {
  return Math.min(3.0, 1 + Math.floor(streak / 7) * 0.1)
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("streak milestone logic", () => {
  it("returns all unlocked when streak >= 100", () => {
    const milestones = buildMilestones(100)
    expect(milestones.every((m) => m.unlocked)).toBe(true)
  })

  it("returns no milestones unlocked when streak is 0", () => {
    const milestones = buildMilestones(0)
    expect(milestones.every((m) => !m.unlocked)).toBe(true)
  })

  it("unlocks exactly the first two when streak is 7", () => {
    const milestones = buildMilestones(7)
    const unlocked = milestones.filter((m) => m.unlocked)
    expect(unlocked).toHaveLength(2)
    expect(unlocked[0].days).toBe(3)
    expect(unlocked[1].days).toBe(7)
  })

  it("unlocks none when streak is 2 (below first milestone)", () => {
    const milestones = buildMilestones(2)
    expect(milestones.filter((m) => m.unlocked)).toHaveLength(0)
  })
})

describe("streak history processing", () => {
  it("marks day as completed when xp_earned > 0", () => {
    const history = buildStreakHistory([
      { activity_date: "2026-05-05", xp_earned: 50 },
    ])
    expect(history[0].completed).toBe(true)
    expect(history[0].xpEarned).toBe(50)
  })

  it("marks day as not completed when xp and time are both 0", () => {
    const history = buildStreakHistory([
      { activity_date: "2026-05-04", xp_earned: 0, time: 0 },
    ])
    expect(history[0].completed).toBe(false)
  })

  it("marks day as completed when time > 0 even with 0 xp", () => {
    const history = buildStreakHistory([
      { activity_date: "2026-05-03", xp_earned: 0, time: 1 },
    ])
    expect(history[0].completed).toBe(true)
  })

  it("returns empty array for empty input", () => {
    expect(buildStreakHistory([])).toEqual([])
  })
})

describe("streak XP multiplier", () => {
  it("returns 1.0 for a 0-day streak", () => {
    expect(computeMultiplier(0)).toBeCloseTo(1.0)
  })

  it("returns 1.1 for a 7-day streak", () => {
    expect(computeMultiplier(7)).toBeCloseTo(1.1)
  })

  it("caps at 3.0 for very high streaks", () => {
    expect(computeMultiplier(999)).toBeCloseTo(3.0)
  })

  it("returns 1.2 for a 14-day streak", () => {
    expect(computeMultiplier(14)).toBeCloseTo(1.2)
  })
})
