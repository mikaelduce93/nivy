/**
 * POST /api/webhooks/cashplus — Cash Plus PSP webhook (scaffolding).
 *
 * Wave Ops-D — webhook lives behind ENV gate `PSP_AUTO_TOPUP_ENABLED`.
 * While the flag is `false` (default), the route still verifies the signature
 * and parses the payload, but logs only — it does NOT credit coins. Founder
 * flips the flag to `true` after the manual-mode threshold (100 families OR
 * 4 weeks) is reached. See docs/vision/ops-runbooks/05-psp-activation.md.
 *
 * Signature: Cash Plus uses HMAC-SHA256 of the raw body, hex-encoded, sent in
 * the `X-CashPlus-Signature` header. Secret = env CASHPLUS_WEBHOOK_SECRET.
 *
 * TODO(founder): once Cash Plus contract is signed, fill in the real payload
 * shape from their integration guide. The placeholder below assumes a JSON
 * body with `transaction_id`, `amount`, `currency`, `customer_phone`, etc.
 *
 * CSRF-exempt via middleware (path prefix /api/webhooks/cashplus).
 * Always returns 200 to prevent provider retry storms — failures are logged.
 */
import { NextResponse } from "next/server"
import {
  processTopupEvent,
  readRawBody,
  verifyHmacSignature,
  type NormalisedTopupEvent,
} from "@/lib/payments/psp-webhook"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const PROVIDER = "cashplus" as const

interface CashPlusPayload {
  // TODO(founder): replace with actual Cash Plus webhook payload shape.
  transaction_id?: string
  amount?: number | string
  currency?: string
  customer_phone?: string
  customer_cin?: string
  metadata?: {
    parent_id?: string
    teen_id?: string
    nivy_link_ref?: string
  }
  status?: string
  // ... add other fields per Cash Plus docs.
}

export async function POST(request: Request) {
  try {
    const rawBody = await readRawBody(request)
    const signature = request.headers.get("x-cashplus-signature")
    const secret = process.env.CASHPLUS_WEBHOOK_SECRET ?? ""

    if (!secret) {
      console.error("[webhook][cashplus] CASHPLUS_WEBHOOK_SECRET not configured — dropping event")
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const valid = verifyHmacSignature({
      rawBody,
      signatureHeader: signature,
      secret,
      algorithm: "sha256",
      encoding: "hex",
    })

    if (!valid) {
      console.warn("[webhook][cashplus] invalid signature — dropping event")
      // Still return 200 so the provider doesn't bombard us with retries; we
      // log loudly enough that ops can flag the discrepancy.
      return NextResponse.json({ received: true }, { status: 200 })
    }

    let payload: CashPlusPayload = {}
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as CashPlusPayload
    } catch (e) {
      console.error("[webhook][cashplus] failed to parse JSON body:", e)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Only process successful collections — Cash Plus may also send pending /
    // failed events that we want to acknowledge without crediting.
    if (payload.status && payload.status !== "succeeded" && payload.status !== "completed") {
      console.log(
        `[webhook][cashplus] ignoring status=${payload.status} ref=${payload.transaction_id}`
      )
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const providerRef = String(payload.transaction_id ?? "").trim()
    const amountDh = Number(payload.amount)

    if (!providerRef || !Number.isFinite(amountDh) || amountDh <= 0) {
      console.warn("[webhook][cashplus] missing transaction_id or invalid amount", payload)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const event: NormalisedTopupEvent = {
      provider: PROVIDER,
      providerRef,
      amountDh,
      raw: payload as unknown as Record<string, unknown>,
      parentHint: {
        phone: payload.customer_phone,
        cin: payload.customer_cin,
        linkRef: payload.metadata?.nivy_link_ref,
        parentId: payload.metadata?.parent_id,
        teenId: payload.metadata?.teen_id,
      },
    }

    const result = await processTopupEvent(event)
    console.log(`[webhook][cashplus] processed ref=${providerRef}`, result)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[webhook][cashplus] unexpected error:", error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
