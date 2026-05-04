import { NextResponse } from "next/server"
import { verifyWebhookSignature } from "@/lib/stripe"
import { dispatchStripeEvent } from "./dispatcher"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

async function getRawBody(request: Request): Promise<Buffer> {
  const chunks: Uint8Array[] = []
  const reader = request.body?.getReader()
  if (!reader) throw new Error("No request body")
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (value) chunks.push(value)
  }
  return Buffer.concat(chunks)
}

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature")
    if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 })

    const rawBody = await getRawBody(request)
    const event = await verifyWebhookSignature(rawBody, signature)

    if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 })

    console.log(`[Stripe Webhook] Processing ${event.type}`)
    await dispatchStripeEvent(event)

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error("[Stripe Webhook] Error:", error)
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 })
  }
}
