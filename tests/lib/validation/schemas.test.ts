import { describe, expect, it } from "vitest"

import {
  emailSchema,
  loginSchema,
  passwordConfirmSchema,
  passwordSchema,
  phoneSchema,
  pseudoSchema,
  urlSchema,
} from "../../../lib/validation/schemas"

describe("emailSchema", () => {
  it("normalizes valid emails to lowercase via the transform pipeline", () => {
    const result = emailSchema.safeParse("Hello.User@Example.COM")

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toBe("hello.user@example.com")
    }
  })

  it("rejects malformed emails and empty strings", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false)
    expect(emailSchema.safeParse("").success).toBe(false)
    expect(emailSchema.safeParse("missing@host").success).toBe(false)
  })
})

describe("passwordSchema", () => {
  it("accepts strong passwords with upper, lower and digit", () => {
    expect(passwordSchema.safeParse("Str0ngPass").success).toBe(true)
  })

  it("rejects passwords missing required character classes or too short", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false)
    expect(passwordSchema.safeParse("nouppercase1").success).toBe(false)
    expect(passwordSchema.safeParse("NOLOWERCASE1").success).toBe(false)
    expect(passwordSchema.safeParse("NoDigitsHere").success).toBe(false)
  })
})

describe("passwordConfirmSchema", () => {
  it("fails when password and confirmation diverge", () => {
    const result = passwordConfirmSchema.safeParse({
      password: "Str0ngPass",
      confirmPassword: "Different1A",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      const flat = result.error.flatten().fieldErrors
      expect(flat.confirmPassword?.length).toBeGreaterThan(0)
    }
  })

  it("succeeds when both fields match", () => {
    const result = passwordConfirmSchema.safeParse({
      password: "Str0ngPass",
      confirmPassword: "Str0ngPass",
    })

    expect(result.success).toBe(true)
  })
})

describe("phoneSchema (Morocco)", () => {
  it("accepts national and international Moroccan formats", () => {
    expect(phoneSchema.safeParse("0612345678").success).toBe(true)
    expect(phoneSchema.safeParse("+212612345678").success).toBe(true)
  })

  it("rejects unsupported prefixes and lengths", () => {
    expect(phoneSchema.safeParse("0412345678").success).toBe(false)
    expect(phoneSchema.safeParse("06123").success).toBe(false)
    expect(phoneSchema.safeParse("+33612345678").success).toBe(false)
  })
})

describe("pseudoSchema", () => {
  it("accepts alphanum and underscore between 3 and 20 chars", () => {
    expect(pseudoSchema.safeParse("nivy_42").success).toBe(true)
  })

  it("rejects pseudos with disallowed characters or wrong length", () => {
    expect(pseudoSchema.safeParse("ab").success).toBe(false)
    expect(pseudoSchema.safeParse("nivy nope").success).toBe(false)
    expect(pseudoSchema.safeParse("contains-dash").success).toBe(false)
  })
})

describe("urlSchema", () => {
  it("requires https URLs only", () => {
    expect(urlSchema.safeParse("https://example.com/path").success).toBe(true)
    expect(urlSchema.safeParse("http://example.com").success).toBe(false)
    expect(urlSchema.safeParse("not a url").success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("validates a complete login payload and normalizes the email", () => {
    const result = loginSchema.safeParse({
      email: "USER@Example.com",
      password: "anything-non-empty",
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("user@example.com")
    }
  })

  it("fails when password is empty", () => {
    const result = loginSchema.safeParse({
      email: "user@example.com",
      password: "",
    })

    expect(result.success).toBe(false)
  })
})
