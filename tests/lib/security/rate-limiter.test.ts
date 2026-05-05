import type { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { rateLimit } from "../../../lib/security/rate-limiter"

let requestSequence = 0

function makeRequest(): NextRequest {
  requestSequence += 1

  return {
    headers: new Headers({
      "x-forwarded-for": `203.0.113.${requestSequence}`,
      "user-agent": `vitest-rate-limit-${requestSequence}`,
    }),
  } as unknown as NextRequest
}

describe("rateLimit", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("allows requests until the configured maximum, then blocks the same client", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-06T10:00:00.000Z"))

    const request = makeRequest()
    const config = { max: 2, window: 1_000 }
    const expectedResetAt = Date.now() + config.window

    await expect(rateLimit(request, config)).resolves.toEqual({
      allowed: true,
      remaining: 1,
      resetAt: expectedResetAt,
    })
    await expect(rateLimit(request, config)).resolves.toEqual({
      allowed: true,
      remaining: 0,
      resetAt: expectedResetAt,
    })
    await expect(rateLimit(request, config)).resolves.toEqual({
      allowed: false,
      remaining: 0,
      resetAt: expectedResetAt,
    })
  })

  it("starts a new window after the reset time", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-05-06T10:00:00.000Z"))

    const request = makeRequest()
    const config = { max: 1, window: 1_000 }

    await expect(rateLimit(request, config)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
    })

    vi.setSystemTime(new Date("2026-05-06T10:00:01.001Z"))

    await expect(rateLimit(request, config)).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
      resetAt: Date.now() + config.window,
    })
  })
})
