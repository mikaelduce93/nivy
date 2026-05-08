/**
 * POST /api/webhooks/m2t — M2T (Inwi Money) PSP webhook (scaffolding).
 *
 * Wave Ops-D — see /api/webhooks/cashplus/route.ts for the architecture
 * narrative. Identical pattern, provider-specific signature header + payload.
 *
 * Signature: M2T historically uses HMAC-SHA256, base64-encoded, in the
 * `X-M2T-Signature` header. Secret = env M2T_WEBHOOK_SECRET.
 *
 * TODO(founder): replace placeholder payload shape once M2T integration kit
 * is in hand.
 *
 * CSRF-exempt via middleware. Always returns 200.
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

const PROVIDER = "m2t" as const

interface M2TPayload {
  // TODO(founder): replace with M2T's actual webhook payload shape.
  trxId?: string
  amount?: number | string
  currency?: string
  msisdn?: string // mobile number
  nationalId?: string
  meta?: {
    parentId?: string
    teenId?: string
    linkRef?: string
  }
  state?: string // 'SUCCESS' | 'PENDING' | 'FAILED'
}

export async function POST(request: Request) {
  try {
    const rawBody = await readRawBody(request)
    const signature = request.headers.get("x-m2t-signature")
    const secret = process.env.M2T_WEBHOOK_SECRET ?? ""

    if (!secret) {
      console.error("[webhook][m2t] M2T_WEBHOOK_SECRET not configured — dropping event")
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const valid = verifyHmacSignature({
      rawBody,
      signatureHeader: signature,
      secret,
      algorithm: "sha256",
      encoding: "base64",
    })

    if (!valid) {
      console.warn("[webhook][m2t] invalid signature — dropping event")
      return NextResponse.json({ received: true }, { status: 200 })
    }

    let payload: M2TPayload = {}
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as M2TPayload
    } catch (e) {
      console.error("[webhook][m2t] failed to parse JSON body:", e)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    if (payload.state && !["SUCCESS", "succeeded", "completed"].includes(payload.state)) {
      console.log(`[webhook][m2t] ignoring state=${payload.state} ref=${payload.trxId}`)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const providerRef = String(payload.trxId ?? "").trim()
    const amountDh = Number(payload.amount)

    if (!providerRef || !Number.isFinite(amountDh) || amountDh <= 0) {
      console.warn("[webhook][m2t] missing trxId or invalid amount", payload)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const event: NormalisedTopupEvent = {
      provider: PROVIDER,
      providerRef,
      amountDh,
      raw: payload as unknown as Record<string, unknown>,
      parentHint: {
        phone: payload.msisdn,
        cin: payload.nationalId,
        linkRef: payload.meta?.linkRef,
        parentId: payload.meta?.parentId,
        teenId: payload.meta?.teenId,
      },
    }

    const result = await processTopupEvent(event)
    console.log(`[webhook][m2t] processed ref=${providerRef}`, result)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[webhook][m2t] unexpected error:", error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
