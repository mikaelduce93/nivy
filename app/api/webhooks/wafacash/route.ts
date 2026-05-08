/**
 * POST /api/webhooks/wafacash — Wafacash PSP webhook (scaffolding).
 *
 * Wave Ops-D — see /api/webhooks/cashplus/route.ts for the architecture
 * narrative. Identical pattern, provider-specific signature header + payload.
 *
 * Signature: Wafacash documentation typically specifies HMAC-SHA512, hex,
 * passed in `X-Wafacash-Signature`. Secret = env WAFACASH_WEBHOOK_SECRET.
 *
 * TODO(founder): replace placeholder payload shape with the real one from
 * Wafacash's integration kit once contract is signed.
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

const PROVIDER = "wafacash" as const

interface WafacashPayload {
  // TODO(founder): replace with Wafacash's actual webhook payload shape.
  reference?: string
  montant?: number | string
  devise?: string
  expediteur_telephone?: string
  expediteur_cin?: string
  custom_fields?: {
    parent_id?: string
    teen_id?: string
    link_ref?: string
  }
  etat?: string
}

export async function POST(request: Request) {
  try {
    const rawBody = await readRawBody(request)
    const signature = request.headers.get("x-wafacash-signature")
    const secret = process.env.WAFACASH_WEBHOOK_SECRET ?? ""

    if (!secret) {
      console.error("[webhook][wafacash] WAFACASH_WEBHOOK_SECRET not configured — dropping event")
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const valid = verifyHmacSignature({
      rawBody,
      signatureHeader: signature,
      secret,
      algorithm: "sha512",
      encoding: "hex",
    })

    if (!valid) {
      console.warn("[webhook][wafacash] invalid signature — dropping event")
      return NextResponse.json({ received: true }, { status: 200 })
    }

    let payload: WafacashPayload = {}
    try {
      payload = JSON.parse(rawBody.toString("utf8")) as WafacashPayload
    } catch (e) {
      console.error("[webhook][wafacash] failed to parse JSON body:", e)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // Wafacash typically uses 'VALIDE' / 'TERMINE' / 'EN_COURS' / 'REJETE'.
    if (payload.etat && !["VALIDE", "TERMINE", "succeeded"].includes(payload.etat)) {
      console.log(
        `[webhook][wafacash] ignoring etat=${payload.etat} ref=${payload.reference}`
      )
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const providerRef = String(payload.reference ?? "").trim()
    const amountDh = Number(payload.montant)

    if (!providerRef || !Number.isFinite(amountDh) || amountDh <= 0) {
      console.warn("[webhook][wafacash] missing reference or invalid montant", payload)
      return NextResponse.json({ received: true }, { status: 200 })
    }

    const event: NormalisedTopupEvent = {
      provider: PROVIDER,
      providerRef,
      amountDh,
      raw: payload as unknown as Record<string, unknown>,
      parentHint: {
        phone: payload.expediteur_telephone,
        cin: payload.expediteur_cin,
        linkRef: payload.custom_fields?.link_ref,
        parentId: payload.custom_fields?.parent_id,
        teenId: payload.custom_fields?.teen_id,
      },
    }

    const result = await processTopupEvent(event)
    console.log(`[webhook][wafacash] processed ref=${providerRef}`, result)
    return NextResponse.json({ received: true }, { status: 200 })
  } catch (error) {
    console.error("[webhook][wafacash] unexpected error:", error)
    return NextResponse.json({ received: true }, { status: 200 })
  }
}
