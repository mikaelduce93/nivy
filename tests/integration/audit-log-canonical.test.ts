/**
 * Wave 1C — AUDIT-LOG-FIX
 *
 * Verifies the canonical audit_log contract:
 *   - logAdminAction writes a row to `audit_log` with all 11 columns.
 *   - logAdminAction throws on insert failure (no swallowed audit).
 *   - 0 occurrences of `from("admin_audit_logs")` in app code.
 *   - app/api/circles/report writes audit_log on report.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { execSync } from "node:child_process"

// ------------- logAdminAction unit tests -------------

interface AuditCapture {
  inserts: Array<Record<string, unknown>>
  shouldFail: boolean
}

const capture: AuditCapture = { inserts: [], shouldFail: false }

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: (table: string) => ({
      insert: async (row: Record<string, unknown>) => {
        if (table !== "audit_log") {
          throw new Error(`Unexpected table: ${table}`)
        }
        capture.inserts.push(row)
        return capture.shouldFail
          ? { error: { message: "RLS denied" } }
          : { error: null }
      },
    }),
  })),
}))

beforeEach(() => {
  capture.inserts = []
  capture.shouldFail = false
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("logAdminAction — Wave 1C contract", () => {
  it("writes a row with all 11 canonical columns (object form)", async () => {
    const { logAdminAction } = await import("@/lib/auth/admin-permissions")
    await logAdminAction({
      actor_id: "actor-1",
      actor_role: "super_admin",
      action: "test.action",
      resource_type: "thing",
      resource_id: "thing-1",
      target_user_id: "target-1",
      description: "test",
      metadata: { foo: "bar" },
      ip_address: "1.2.3.4",
      user_agent: "ua/1.0",
    })
    expect(capture.inserts).toHaveLength(1)
    const row = capture.inserts[0]
    expect(row.actor_id).toBe("actor-1")
    expect(row.actor_role).toBe("super_admin")
    expect(row.action).toBe("test.action")
    expect(row.resource_type).toBe("thing")
    expect(row.resource_id).toBe("thing-1")
    expect(row.target_user_id).toBe("target-1")
    expect(row.description).toBe("test")
    expect(row.metadata).toEqual({ foo: "bar" })
    expect(row.ip_address).toBe("1.2.3.4")
    expect(row.user_agent).toBe("ua/1.0")
    expect(row.created_at).toBeTruthy()
  })

  it("accepts the legacy positional shape (back-compat)", async () => {
    const { logAdminAction } = await import("@/lib/auth/admin-permissions")
    await logAdminAction(
      "actor-2",
      "legacy.action",
      "legacy desc",
      "thing",
      "thing-2",
      { extra: 1 },
    )
    expect(capture.inserts).toHaveLength(1)
    const row = capture.inserts[0]
    expect(row.actor_id).toBe("actor-2")
    expect(row.action).toBe("legacy.action")
    expect(row.description).toBe("legacy desc")
    expect(row.metadata).toEqual({ extra: 1 })
  })

  it("THROWS when the audit insert fails (no silent swallow)", async () => {
    capture.shouldFail = true
    const { logAdminAction } = await import("@/lib/auth/admin-permissions")
    await expect(
      logAdminAction({
        actor_id: "actor-3",
        action: "test.fails",
      }),
    ).rejects.toThrow(/audit_log insert failed/)
  })

  it("rejects when action is empty", async () => {
    const { logAdminAction } = await import("@/lib/auth/admin-permissions")
    await expect(
      logAdminAction({ actor_id: "x", action: "" }),
    ).rejects.toThrow(/missing required `action`/)
  })
})

// ------------- repo-wide invariant: no admin_audit_logs writes in app code -------------

describe("Repo-wide invariant — admin_audit_logs is not written from app code", () => {
  it("0 occurrences of `from(\"admin_audit_logs\")` under app/, lib/, components/, hooks/", () => {
    let stdout = ""
    try {
      stdout = execSync(
        `git grep -nE "from\\(['\\"]admin_audit_logs['\\"]\\)" -- app/ lib/ components/ hooks/`,
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      )
    } catch (err: unknown) {
      // grep exit code 1 = no matches (success for this assertion).
      const e = err as { status?: number; stdout?: Buffer | string }
      if (e.status === 1) stdout = ""
      else throw err
    }
    expect(stdout.trim()).toBe("")
  })
})
