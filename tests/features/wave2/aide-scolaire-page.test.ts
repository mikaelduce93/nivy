/**
 * Unit tests for /teen/aide-scolaire Wave 2 data logic.
 * Tests the grade aggregation logic that the server component
 * applies before passing serialized props to AideScolaireClient.
 */
import { describe, expect, it } from "vitest"

interface GradeRow {
  subject: string
  subject_label: string
  grade: number
  max_grade: number
  xp_awarded?: number
}

// Mirrors the aggregation in app/teen/aide-scolaire/page.tsx
function buildSubjectStats(grades: GradeRow[]) {
  const subjectMap: Record<
    string,
    { label: string; grades: { grade: number; maxGrade: number }[] }
  > = {}

  for (const g of grades) {
    if (!subjectMap[g.subject]) {
      subjectMap[g.subject] = { label: g.subject_label, grades: [] }
    }
    subjectMap[g.subject].grades.push({ grade: g.grade, maxGrade: g.max_grade })
  }

  return Object.entries(subjectMap).map(([subject, info]) => {
    const avg =
      info.grades.length > 0
        ? info.grades.reduce(
            (sum, g) => sum + (g.grade / g.maxGrade) * 20,
            0
          ) / info.grades.length
        : null
    return {
      subject,
      label: info.label,
      count: info.grades.length,
      average: avg !== null ? Math.round(avg * 10) / 10 : null,
    }
  })
}

function totalXP(grades: GradeRow[]) {
  return grades.reduce((sum, g) => sum + (g.xp_awarded ?? 0), 0)
}

describe("aide-scolaire grade aggregation", () => {
  it("returns empty subjects for empty grades", () => {
    expect(buildSubjectStats([])).toEqual([])
  })

  it("correctly computes average for a single perfect score", () => {
    const stats = buildSubjectStats([
      { subject: "math", subject_label: "Mathématiques", grade: 20, max_grade: 20 },
    ])
    expect(stats).toHaveLength(1)
    expect(stats[0].average).toBe(20)
    expect(stats[0].count).toBe(1)
  })

  it("computes average for multiple grades in same subject", () => {
    const stats = buildSubjectStats([
      { subject: "math", subject_label: "Mathématiques", grade: 16, max_grade: 20 },
      { subject: "math", subject_label: "Mathématiques", grade: 12, max_grade: 20 },
    ])
    expect(stats).toHaveLength(1)
    // (16/20 * 20 + 12/20 * 20) / 2 = (16 + 12) / 2 = 14
    expect(stats[0].average).toBe(14)
    expect(stats[0].count).toBe(2)
  })

  it("groups subjects correctly", () => {
    const stats = buildSubjectStats([
      { subject: "math",    subject_label: "Maths",    grade: 18, max_grade: 20 },
      { subject: "french",  subject_label: "Français", grade: 15, max_grade: 20 },
      { subject: "math",    subject_label: "Maths",    grade: 14, max_grade: 20 },
    ])
    expect(stats).toHaveLength(2)
    const math = stats.find((s) => s.subject === "math")!
    expect(math.count).toBe(2)
    expect(math.average).toBe(16) // (18 + 14) / 2
    const french = stats.find((s) => s.subject === "french")!
    expect(french.count).toBe(1)
    expect(french.average).toBe(15)
  })

  it("handles grade out of custom max_grade", () => {
    // 15/30 * 20 = 10
    const stats = buildSubjectStats([
      { subject: "physics", subject_label: "Physique", grade: 15, max_grade: 30 },
    ])
    expect(stats[0].average).toBe(10)
  })
})

describe("aide-scolaire total XP calculation", () => {
  it("returns 0 for empty grades", () => {
    expect(totalXP([])).toBe(0)
  })

  it("sums xp_awarded correctly", () => {
    const grades: GradeRow[] = [
      { subject: "math", subject_label: "Maths", grade: 18, max_grade: 20, xp_awarded: 75 },
      { subject: "french", subject_label: "Français", grade: 14, max_grade: 20, xp_awarded: 50 },
    ]
    expect(totalXP(grades)).toBe(125)
  })

  it("treats missing xp_awarded as 0", () => {
    const grades: GradeRow[] = [
      { subject: "math", subject_label: "Maths", grade: 18, max_grade: 20 },
    ]
    expect(totalXP(grades)).toBe(0)
  })
})
