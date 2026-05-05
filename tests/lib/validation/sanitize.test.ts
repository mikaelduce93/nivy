import { describe, expect, it } from "vitest"

import {
  containsUnsafeContent,
  escapeHtml,
  isSafeFileExtension,
  sanitizeEmail,
  sanitizeForDisplay,
  sanitizeObject,
  sanitizePhone,
  sanitizeUrl,
  unescapeHtml,
} from "../../../lib/validation/sanitize"

describe("HTML sanitization", () => {
  it("escapes and unescapes dangerous HTML characters", () => {
    const raw = `<a href="/admin?x=1&y='2'">Admin</a>`
    const escaped = escapeHtml(raw)

    expect(escaped).toBe(
      "&lt;a href&#x3D;&quot;&#x2F;admin?x&#x3D;1&amp;y&#x3D;&#x27;2&#x27;&quot;&gt;Admin&lt;&#x2F;a&gt;",
    )
    expect(unescapeHtml(escaped)).toBe(raw)
  })

  it("removes script vectors before escaping display content", () => {
    const sanitized = sanitizeForDisplay(
      `<img src="x" onerror="alert(1)"><script>alert("x")</script><a href="javascript:alert(1)">go</a>`,
    )

    expect(sanitized).not.toContain("<script")
    expect(sanitized).not.toContain("onerror")
    expect(sanitized).not.toContain("javascript:")
    expect(sanitized).toContain("&lt;img")
    expect(sanitized).toContain("&lt;a href")
  })

  it("detects common unsafe content patterns", () => {
    expect(containsUnsafeContent("Hello world")).toBe(false)
    expect(containsUnsafeContent(`<iframe src="https://example.com"></iframe>`)).toBe(true)
    expect(containsUnsafeContent(`<a onclick="steal()">Click</a>`)).toBe(true)
  })
})

describe("URL and input sanitization", () => {
  it("rejects dangerous URL protocols and trims safe URLs", () => {
    expect(sanitizeUrl(" javascript:alert(1) ")).toBe("")
    expect(sanitizeUrl("data:text/html,<script>alert(1)</script>")).toBe("")
    expect(sanitizeUrl("\u0000 https://example.com/path?q=1 ")).toBe(
      "https://example.com/path?q=1",
    )
  })

  it("normalizes email and phone inputs", () => {
    expect(sanitizeEmail(" USER+Test@Example.COM<script> ")).toBe(
      "user+test@example.comscript",
    )
    expect(sanitizePhone(" +33 (0) 6 12-34-56 ext. 99 ")).toBe("+330612345699")
  })

  it("accepts only allowlisted file extensions", () => {
    expect(isSafeFileExtension("contract.PDF")).toBe(true)
    expect(isSafeFileExtension("avatar.png")).toBe(true)
    expect(isSafeFileExtension("payload.html")).toBe(false)
    expect(isSafeFileExtension("no-extension")).toBe(false)
  })
})

describe("sanitizeObject", () => {
  it("recursively strips scripts, trims strings, and drops prototype pollution keys", () => {
    const payload = JSON.parse(`{
      "name": "  Nivy  ",
      "__proto__": { "polluted": true },
      "profile": {
        "bio": "<script>alert(1)</script> Welcome ",
        "links": [" javascript:alert(1) ", " https://example.com "]
      }
    }`)

    const sanitized = sanitizeObject(payload)

    expect(Object.prototype.hasOwnProperty.call(sanitized, "__proto__")).toBe(false)
    expect(sanitized).toMatchObject({
      name: "Nivy",
      profile: {
        bio: "Welcome",
        links: ["alert(1)", "https://example.com"],
      },
    })
  })
})
