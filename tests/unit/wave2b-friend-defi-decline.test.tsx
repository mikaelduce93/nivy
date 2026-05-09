/**
 * Wave 2B — friend-defi decline client now POSTs to /decline (not /accept).
 *
 * Verifies the canon §9 FORBIDDEN regression fix: previously the decline
 * action posted `{action: 'decline'}` to /accept; now it MUST hit the
 * dedicated /decline route.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

const CLIENT_FILE = resolve(
  process.cwd(),
  "app/teen/quests/friend-defis/friend-defis-client.tsx",
)

describe("friend-defis-client.tsx decline route", () => {
  const source = readFileSync(CLIENT_FILE, "utf8")

  it("contains a handleDecline that POSTs to /decline", () => {
    // The decline handler must reference the dedicated /decline route.
    expect(source).toMatch(/\/api\/teen\/friend-challenges\/\$\{[^}]+\}\/decline/)
  })

  it("does NOT route decline through /accept with action=decline (canon §9 FORBIDDEN regression)", () => {
    // Locate the handleDecline function body and ensure it doesn't fetch /accept.
    const declineFn = source.split("async function handleDecline")[1] ?? ""
    const fnBody = declineFn.split("async function ")[0]
    expect(fnBody).toMatch(/\/decline/)
    expect(fnBody).not.toMatch(/\/accept/)
    expect(fnBody).not.toMatch(/action:\s*["']decline["']/)
  })
})
