/**
 * Wave 5C — static guards for design / mobile a11y polish.
 *
 * 1. NotificationBell trigger has aria-label and Bell is aria-hidden
 *    (canon §5 — primitives surfaced in every role header).
 * 2. Select / Tabs / InputOTP touch targets meet the canon §5 44px
 *    lock via min-h-11 (and min-w-11 for OTP).
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const ROOT = process.cwd()
const read = (p: string) => readFileSync(resolve(ROOT, p), "utf8")

describe("Wave 5C — NotificationBell a11y", () => {
  const src = read("components/notifications/notification-bell.tsx")

  it("trigger button carries an aria-label", () => {
    // The label dynamically reflects unreadCount.
    expect(src).toMatch(/aria-label=\{[\s\S]*?Notifications/)
  })

  it("Bell icon is aria-hidden", () => {
    // <Bell ... aria-hidden="true" />
    expect(src).toMatch(/<Bell[\s\S]*?aria-hidden=["']true["']/)
  })

  it("unread count badge is aria-hidden (label conveys the count)", () => {
    expect(src).toMatch(/<span[\s\S]*?aria-hidden=["']true["'][\s\S]*?-top-1 -right-1/)
  })
})

describe("Wave 5C — touch-target lock (canon §5)", () => {
  it("Select trigger carries min-h-11", () => {
    const src = read("components/ui/select.tsx")
    expect(src).toContain("min-h-11")
  })

  it("Tabs trigger carries min-h-11", () => {
    const src = read("components/ui/tabs.tsx")
    expect(src).toMatch(/TabsTrigger[\s\S]*?min-h-11/)
  })

  it("InputOTP slot carries min-h-11 and min-w-11", () => {
    const src = read("components/ui/input-otp.tsx")
    expect(src).toContain("min-h-11")
    expect(src).toContain("min-w-11")
  })
})
