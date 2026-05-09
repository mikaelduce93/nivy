/**
 * Wave 4B — confirmToast() Promise contract.
 *
 * Verifies the helper resolves true on action click, false on cancel /
 * dismiss / auto-close. We mock sonner so we don't render anything in
 * the node test environment.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

interface CapturedToastOpts {
  description?: string
  duration?: number
  action?: { label: string; onClick: () => void }
  cancel?: { label: string; onClick: () => void }
  onDismiss?: () => void
  onAutoClose?: () => void
  className?: string
}
let lastOpts: CapturedToastOpts | null = null

vi.mock("sonner", () => ({
  toast: vi.fn((_message: string, opts: CapturedToastOpts) => {
    lastOpts = opts
    return "toast-id"
  }),
}))

const { confirmToast } = await import("@/lib/ui/confirm-toast")

beforeEach(() => {
  lastOpts = null
})
afterEach(() => vi.clearAllMocks())

describe("confirmToast", () => {
  it("resolves true when action.onClick fires", async () => {
    const p = confirmToast({ message: "Delete?" })
    expect(lastOpts?.action).toBeTruthy()
    lastOpts!.action!.onClick()
    await expect(p).resolves.toBe(true)
  })

  it("resolves false when cancel.onClick fires", async () => {
    const p = confirmToast({ message: "Delete?" })
    expect(lastOpts?.cancel).toBeTruthy()
    lastOpts!.cancel!.onClick()
    await expect(p).resolves.toBe(false)
  })

  it("resolves false when onDismiss fires (and stays false even if action also fires)", async () => {
    const p = confirmToast({ message: "Delete?" })
    lastOpts!.onDismiss!()
    // Settle is idempotent — a later action click must NOT flip the result.
    lastOpts!.action!.onClick()
    await expect(p).resolves.toBe(false)
  })

  it("resolves false when onAutoClose fires", async () => {
    const p = confirmToast({ message: "Delete?", durationMs: 1 })
    lastOpts!.onAutoClose!()
    await expect(p).resolves.toBe(false)
  })

  it("destructive flag adds the red border class", () => {
    confirmToast({ message: "Delete?", destructive: true })
    expect(lastOpts?.className).toContain("border-red-500")
  })

  it("custom labels propagate to the toast options", () => {
    confirmToast({
      message: "x",
      actionLabel: "Yes do it",
      cancelLabel: "Stop",
      description: "Hello",
    })
    expect(lastOpts?.action?.label).toBe("Yes do it")
    expect(lastOpts?.cancel?.label).toBe("Stop")
    expect(lastOpts?.description).toBe("Hello")
  })
})
