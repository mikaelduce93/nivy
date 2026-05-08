/**
 * Wave 1B — CIN signed-URL helper test.
 *
 * Verifies:
 *   1. Parent self-view TTL is 5 min (300 s).
 *   2. Admin review TTL is 15 min (900 s) and clamped at 30-min hard cap.
 *   3. Helper refuses to sign URL-shaped values (defensive — only paths).
 *   4. createSignedUrl is invoked, getPublicUrl is NOT.
 */
import { describe, it, expect, vi } from "vitest"
import {
  CIN_BUCKET,
  CIN_TTL_PARENT_SELF,
  CIN_TTL_ADMIN_REVIEW,
  CIN_TTL_HARD_CAP,
  signCin,
} from "@/lib/storage/cin-signed-url"

function makeMockSupabase(opts: { signedUrl?: string; error?: unknown } = {}) {
  const calls: { bucket: string; method: string; args: unknown[] }[] = []
  return {
    calls,
    storage: {
      from(bucket: string) {
        return {
          createSignedUrl: vi.fn(async (...args: unknown[]) => {
            calls.push({ bucket, method: "createSignedUrl", args })
            if (opts.error) return { data: null, error: opts.error }
            return {
              data: { signedUrl: opts.signedUrl ?? "https://signed/x" },
              error: null,
            }
          }),
          getPublicUrl: vi.fn(() => {
            calls.push({ bucket, method: "getPublicUrl", args: [] })
            return { data: { publicUrl: "FORBIDDEN" } }
          }),
        }
      },
    },
  }
}

describe("signCin", () => {
  it("uses the cin-scans bucket and createSignedUrl with parent TTL", async () => {
    const supabase = makeMockSupabase({ signedUrl: "https://signed/parent" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await signCin(supabase as any, "parent-uuid/cin-front-1.jpg", "parent")
    expect(url).toBe("https://signed/parent")
    expect(supabase.calls).toHaveLength(1)
    expect(supabase.calls[0].bucket).toBe(CIN_BUCKET)
    expect(supabase.calls[0].method).toBe("createSignedUrl")
    expect(supabase.calls[0].args[1]).toBe(CIN_TTL_PARENT_SELF)
  })

  it("uses admin TTL for admin viewer", async () => {
    const supabase = makeMockSupabase({ signedUrl: "https://signed/admin" })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signCin(supabase as any, "p/cin.jpg", "admin")
    expect(supabase.calls[0].args[1]).toBe(CIN_TTL_ADMIN_REVIEW)
  })

  it("never exceeds the 30-min hard cap", () => {
    expect(CIN_TTL_PARENT_SELF).toBeLessThanOrEqual(CIN_TTL_HARD_CAP)
    expect(CIN_TTL_ADMIN_REVIEW).toBeLessThanOrEqual(CIN_TTL_HARD_CAP)
  })

  it("refuses to sign a URL-shaped value (defensive)", async () => {
    const supabase = makeMockSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = await signCin(supabase as any, "https://leak.example/x.jpg", "parent")
    expect(url).toBeNull()
    expect(supabase.calls).toHaveLength(0)
  })

  it("never calls getPublicUrl", async () => {
    const supabase = makeMockSupabase()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await signCin(supabase as any, "p/cin.jpg", "parent")
    const publicCalls = supabase.calls.filter((c) => c.method === "getPublicUrl")
    expect(publicCalls).toHaveLength(0)
  })
})
