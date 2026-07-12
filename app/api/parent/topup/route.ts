/**
 * POST /api/parent/topup — Wave 1B canonical top-up endpoint.
 *
 * Per docs/canon/economy-payments.locked.md §4.1 and §6 FORBIDDEN #3:
 *   - 1 DH = 100 coins (server-computed; never trust client).
 *   - parentId is derived from the authenticated session (NEVER from body).
 *   - Body MUST be one of:
 *       { teenId, amount_dh:number, client_idempotency_key:uuid }
 *       { teenId, packageId,        client_idempotency_key:uuid }
 *     Any extra `coins`, `bonus`, `price`, `parentId` fields are ignored.
 *   - Idempotency: payment_transactions.client_idempotency_key UNIQUE.
 *     A duplicate key returns the previous payment idempotently.
 *
 * Per founder ruling F5 (2026-05-08): manual top-up only at launch.
 * The PSP webhook (auto top-up) path is feature-gated by
 * PSP_AUTO_TOPUP_ENABLED at the route level, not here.
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { TOPUP_PACKAGES, PARENT_TOPUP_MAX_DH } from "@/lib/payments/topup-packages"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const bodySchemaAmount = z.object({
  teenId: z.string().regex(UUID_RE, "teenId must be a UUID"),
  amount_dh: z.number().positive().finite().max(100_000),
  client_idempotency_key: z.string().regex(UUID_RE, "client_idempotency_key must be a UUID"),
})

const bodySchemaPackage = z.object({
  teenId: z.string().regex(UUID_RE, "teenId must be a UUID"),
  packageId: z.string(),
  client_idempotency_key: z.string().regex(UUID_RE, "client_idempotency_key must be a UUID"),
})

const bodySchema = z.union([bodySchemaAmount, bodySchemaPackage])

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()
    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Requête invalide",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const body = parsed.data
    const teenId = body.teenId
    const idempotencyKey = body.client_idempotency_key

    // Resolve amount_dh server-side. Body amount is trusted only when present;
    // otherwise we derive from the server-side package map. Per canon §6
    // FORBIDDEN #3 we NEVER trust client-supplied coins/bonus/price values.
    let amountDh: number
    if ("amount_dh" in body) {
      amountDh = body.amount_dh
    } else {
      // #351 — packs servis par lib/payments/topup-packages (miroir de la table
      // serveur `topup_packages`). Le prix ne vient JAMAIS du client.
      const pkg = TOPUP_PACKAGES.find((p) => p.id === body.packageId)
      if (!pkg) {
        return NextResponse.json(
          { success: false, error: "Pack inconnu" },
          { status: 400 }
        )
      }
      amountDh = pkg.price
    }

    if (!Number.isFinite(amountDh) || amountDh <= 0) {
      return NextResponse.json(
        { success: false, error: "Montant invalide" },
        { status: 400 }
      )
    }
    if (amountDh > PARENT_TOPUP_MAX_DH) {
      return NextResponse.json(
        {
          success: false,
          error: `Montant maximum dépassé (${PARENT_TOPUP_MAX_DH} DH)`,
        },
        { status: 400 }
      )
    }
    // Round to 2 decimals — DB column is numeric(10,2).
    amountDh = Math.round(amountDh * 100) / 100

    const supabase = await createClient()
    const parentId = userInfo.profileId

    // Verify parent-teen link (status='active' per canon).
    const { data: link } = await supabase
      .from("parent_teen_links")
      .select("id")
      .eq("parent_id", parentId)
      .eq("teen_id", teenId)
      .eq("status", "active")
      .limit(1)
      .maybeSingle()

    if (!link) {
      return NextResponse.json(
        { success: false, error: "Teen non lié à ce compte parent" },
        { status: 403 }
      )
    }

    // E-signature gate (parent-control canon §10).
    const { data: signature } = await supabase
      .from("e_signatures")
      .select("id")
      .eq("parent_id", parentId)
      .eq("terms_accepted", true)
      .limit(1)
      .maybeSingle()

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Autorisation parentale requise",
          requiresSignature: true,
        },
        { status: 403 }
      )
    }

    // Idempotency dedupe BEFORE we call the RPC: a parent who double-clicks
    // submit gets the original payment back, not a fresh credit.
    const admin = createServiceRoleClient()
    const { data: existing } = await admin
      .from("payment_transactions")
      .select("id, amount_dh, amount_coins, status, parent_id, teen_id")
      .eq("client_idempotency_key", idempotencyKey)
      .limit(1)
      .maybeSingle()

    if (existing) {
      // Defense-in-depth: never let one parent's idempotency key surface
      // another parent's payment.
      if (existing.parent_id !== parentId || existing.teen_id !== teenId) {
        return NextResponse.json(
          { success: false, error: "Idempotency key conflict" },
          { status: 409 }
        )
      }
      return NextResponse.json({
        success: true,
        idempotent_replay: true,
        message: "Recharge déjà traitée",
        data: {
          paymentId: existing.id,
          amountCoins: existing.amount_coins,
          amountDh: existing.amount_dh,
          status: existing.status,
        },
      })
    }

    // Atomic top-up via SECURITY DEFINER RPC. The 5-arg overload writes
    // psp_provider+psp_reference; we tag this manual rail per F5.
    // The RPC computes amount_coins server-side as amount_dh*100 (canon §2.1).
    const providerRef = `manual:${idempotencyKey}`
    const { data: rpcData, error } = await admin.rpc("top_up_teen", {
      p_parent_id: parentId,
      p_teen_id: teenId,
      p_amount_dh: amountDh,
      p_provider: "manual",
      p_provider_ref: providerRef,
    })

    if (error) {
      console.error("[topup] RPC error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    if (!rpcData?.success) {
      return NextResponse.json(
        { success: false, error: rpcData?.error || "Recharge impossible" },
        { status: 400 }
      )
    }

    // Persist the idempotency key on the resulting payment row so future
    // duplicates dedupe on the canonical column. The RPC creates the row
    // keyed on (psp_provider, psp_reference); we only need to attach the
    // client key. Failure here is non-fatal but logged — the unique index
    // on client_idempotency_key still protects against double credit at the
    // RPC level via psp_reference uniqueness.
    if (rpcData.payment_id) {
      const { error: keyAttachErr } = await admin
        .from("payment_transactions")
        .update({ client_idempotency_key: idempotencyKey })
        .eq("id", rpcData.payment_id)
      if (keyAttachErr) {
        console.error("[topup] failed to attach idempotency key:", keyAttachErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: "Recharge effectuée avec succès",
      data: {
        paymentId: rpcData.payment_id,
        amountCoins: rpcData.amount_coins,
        amountDh,
        newBalance: rpcData.new_balance,
      },
    })
  } catch (error) {
    console.error("[topup] unexpected error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
