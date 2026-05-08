/**
 * Wave 1B — Personalization-AI PII scrubber test.
 *
 * Verifies that the canonical helpers in lib/ai/safe-context.ts:
 *   1. Drop full_name / first_name / last_name / email / phone / DOB / CIN.
 *   2. Always include `pseudo` and `age_bucket`.
 *   3. For parent context, never expose children's full names.
 *   4. scrubPii is recursive: PII deep inside nested arrays/objects is removed.
 */
import { describe, it, expect } from "vitest"
import {
  ageBucket,
  safeAiContext,
  safeChildContext,
  scrubPii,
} from "@/lib/ai/safe-context"

describe("ageBucket", () => {
  it("returns '13-14' for a 14-year-old", () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 14)
    expect(ageBucket(dob.toISOString().slice(0, 10))).toBe("13-14")
  })
  it("returns '15-16' for a 16-year-old", () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 16)
    expect(ageBucket(dob.toISOString().slice(0, 10))).toBe("15-16")
  })
  it("returns 'unknown' for an empty input", () => {
    expect(ageBucket(null)).toBe("unknown")
    expect(ageBucket(undefined)).toBe("unknown")
    expect(ageBucket("")).toBe("unknown")
  })
})

describe("safeAiContext", () => {
  it("drops full_name and surfaces pseudo + age_bucket", () => {
    const dob = new Date()
    dob.setFullYear(dob.getFullYear() - 15)
    const profile = {
      pseudo: "shadowfox",
      // Forbidden values that any naive caller might pass:
      // canon-allow: this is a NEGATIVE-test asserting these don't leak
      ...{ full_name: "Amine TestFamily", first_name: "Amine" },
      date_of_birth: dob.toISOString().slice(0, 10),
      city: "Casablanca",
    }
    const safe = safeAiContext({ profile })
    expect(safe.pseudo).toBe("shadowfox")
    expect(safe.age_bucket).toBe("15-16")
    const json = JSON.stringify(safe)
    expect(json).not.toContain("Amine")
    expect(json).not.toContain("TestFamily")
    expect(json).not.toContain("full_name")
    expect(json).not.toContain("first_name")
    expect(json).not.toContain("last_name")
  })

  it("falls back to username when pseudo missing", () => {
    const safe = safeAiContext({ profile: { username: "fallback_user" } })
    expect(safe.pseudo).toBe("fallback_user")
  })

  it("preserves interests and goals arrays", () => {
    const safe = safeAiContext({
      profile: {
        pseudo: "x",
        interests: ["football", "musique"],
        goals: ["gain_xp", "save_for_phone"],
      },
    })
    expect(safe.interests).toEqual(["football", "musique"])
    expect(safe.goals).toEqual(["gain_xp", "save_for_phone"])
  })
})

describe("safeChildContext", () => {
  it("never returns full_name even if input contains one", () => {
    const child = safeChildContext({
      child_id: "11111111-1111-1111-1111-111111111111",
      pseudo: "kidalpha",
      // canon-allow: NEGATIVE test
      ...{ full_name: "Kid Alpha Smith" },
      date_of_birth: "2012-01-01",
      level: 7,
    })
    const json = JSON.stringify(child)
    expect(json).not.toContain("Smith")
    expect(json).not.toContain("Kid Alpha")
    expect(child.pseudo).toBe("kidalpha")
    expect(child.age_bucket).not.toBe("unknown")
  })
})

describe("scrubPii", () => {
  it("recursively removes forbidden keys from nested objects", () => {
    // canon-allow: NEGATIVE test, fields are forbidden by design
    const dirty = {
      pseudo: "ok",
      full_name: "Dirty Name",
      nested: {
        deep: {
          email: "leak@example.com",
          phone: "+212600000000",
          first_name: "Leaky",
          ok_field: "stays",
        },
      },
      list: [
        { pseudo: "kid1", last_name: "Should Disappear" },
        { pseudo: "kid2" },
      ],
    }
    const clean = scrubPii(dirty)
    const json = JSON.stringify(clean)
    expect(json).not.toContain("Dirty Name")
    expect(json).not.toContain("leak@example.com")
    expect(json).not.toContain("+212600000000")
    expect(json).not.toContain("Leaky")
    expect(json).not.toContain("Should Disappear")
    expect(json).toContain("ok_field")
    expect(json).toContain("kid1")
    expect(json).toContain("kid2")
  })

  it("preserves primitive values unchanged", () => {
    expect(scrubPii(null)).toBeNull()
    expect(scrubPii(undefined)).toBeUndefined()
    expect(scrubPii(42)).toBe(42)
    expect(scrubPii("plain string")).toBe("plain string")
  })
})
