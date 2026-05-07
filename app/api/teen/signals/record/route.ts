/**
 * Wave 1.2 — POST /api/teen/signals/record
 *
 * Body: { signal_type, target_type, target_id, metadata? }
 * Resolves teen_id from the session — clients cannot spoof another user.
 *
 * Per docs/vision/PRODUCT_WHITEPAPER.md §19.5: behavioral signals power the
 * personalization engine. Capture is best-effort: a 500 from the RPC must
 * never surface to the user-visible operation that emitted it.
 */
import { NextRequest, NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { rateLimit } from "@/lib/security/rate-limiter"
import {
  recordSignal,
  type SignalType,
  type SignalTargetType,
} from "@/lib/analytics/signals"

const ALLOWED_SIGNAL_TYPES: SignalType[] = [
  "view",
  "click",
  "start",
  "complete",
  "abandon",
  "share",
  "favorite",
  "dismiss",
  "report",
]

const ALLOWED_TARGET_TYPES: SignalTargetType[] = [
  "quiz",
  "defi",
  "event",
  "partner_offer",
  "friend_profile",
  "quest",
  "mission",
  "reward",
  "feed_post",
  "mentor",
  "partner",
]

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RecordSignalBody {
  signal_type?: string
  target_type?: string
  target_id?: string
  metadata?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "teen" || !userInfo.teenData?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const teenId = userInfo.teenData.id

    // 100 signals/min/teen (per Wave 1.2 spec). Keyed via the rate-limiter's
    // IP+UA key — adequate for in-memory protection against runaway clients.
    const rl = await rateLimit(request, { max: 100, window: 60_000 })
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "rate_limited" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetAt),
          },
        }
      )
    }

    const body = (await request.json().catch(() => null)) as RecordSignalBody | null
    if (!body) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 })
    }

    const signalType = body.signal_type as SignalType | undefined
    const targetType = body.target_type as SignalTargetType | undefined
    const targetId = body.target_id

    if (!signalType || !ALLOWED_SIGNAL_TYPES.includes(signalType)) {
      return NextResponse.json({ error: "invalid_signal_type" }, { status: 400 })
    }
    if (!targetType || !ALLOWED_TARGET_TYPES.includes(targetType)) {
      return NextResponse.json({ error: "invalid_target_type" }, { status: 400 })
    }
    if (!targetId || !UUID_RE.test(targetId)) {
      return NextResponse.json({ error: "invalid_target_id" }, { status: 400 })
    }

    const id = await recordSignal({
      teenId,
      signalType,
      targetType,
      targetId,
      metadata: body.metadata,
    })

    if (id === null) {
      // recordSignal swallows the underlying error; return 502 so callers can
      // distinguish "we tried, it didn't stick" from "you sent garbage".
      return NextResponse.json({ error: "record_failed" }, { status: 502 })
    }

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error("[teen/signals/record] unexpected:", err)
    return NextResponse.json({ error: "internal_error" }, { status: 500 })
  }
}
