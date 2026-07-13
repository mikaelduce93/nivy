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

    // Atomic top-up via SECURITY DEFINER RPC. The 6-arg overload (mig 199,
    // F3.a) writes psp_provider+psp_reference AND attaches the client
    // idempotency key atomically inside the RPC, so the post-RPC UPDATE is no
    // longer needed. We tag this manual rail per F5.
    // The RPC computes amount_coins server-side as amount_dh*100 (canon §2.1).
    // p_idempotency_key = the client UUID (same value embedded in providerRef);
    // the RPC casts text→uuid and inserts it into payment_transactions.
    const providerRef = `manual:${idempotencyKey}`
    const { data: rpcRaw, error } = await admin.rpc("top_up_teen", {
      p_parent_id: parentId,
      p_teen_id: teenId,
      p_amount_dh: amountDh,
      p_provider: "manual",
      p_provider_ref: providerRef,
      p_idempotency_key: idempotencyKey,
    })
    // Le RPC retourne un jsonb (typé Json par le codegen Supabase) ; contrat
    // réel documenté dans la migration 179 / 095.
    const rpcData = (rpcRaw ?? null) as {
      success?: boolean
      error?: string
      cap_dh?: number
      mtd_dh?: number
      payment_id?: string
      amount_coins?: number
      new_balance?: number
      idempotent_replay?: boolean
    } | null

    if (error) {
      console.error("[topup] RPC error:", error)
      return NextResponse.json(
        { success: false, error: error.message || "Erreur serveur" },
        { status: 500 }
      )
    }

    if (!rpcData?.success) {
      // F6 (mig 179) — plafonds BAM enforcés par le RPC ; messages lisibles,
      // montants issus du RPC (les caps sont overridables post-KYC).
      const capMessages: Record<string, string> = {
        exceeds_single_topup_cap: `Plafond par recharge dépassé (max ${rpcData?.cap_dh ?? 200} DH par opération)`,
        exceeds_parent_monthly_cap: `Plafond mensuel de recharge atteint (${rpcData?.cap_dh ?? 500} DH/mois — déjà rechargé ce mois-ci : ${rpcData?.mtd_dh ?? 0} DH)`,
        exceeds_teen_monthly_cap: `Plafond mensuel de réception atteint pour cet ado (${rpcData?.cap_dh ?? 5000} DH/mois, tous parents confondus)`,
      }
      const friendly = rpcData?.error ? capMessages[rpcData.error as string] : undefined
      return NextResponse.json(
        { success: false, error: friendly || rpcData?.error || "Recharge impossible", code: rpcData?.error },
        { status: 400 }
      )
    }

    // The RPC (mig 199, F3.a) now attaches client_idempotency_key ATOMICALLY
    // during the payment_transactions INSERT (p_idempotency_key arg above), so
    // a post-RPC UPDATE is no longer needed. Previously a retry that landed
    // between the RPC commit and this UPDATE could dedupe via psp_reference
    // but leave the client-key column NULL on the winner row — now both are
    // set in the same statement, so future duplicates dedupe on the canonical
    // column directly.

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
