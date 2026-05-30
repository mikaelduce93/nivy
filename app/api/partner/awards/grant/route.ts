import { NextResponse } from "next/server"
import { z } from "zod"
import { createClient } from "@/lib/supabase/server"

// Refonte V1.5 (#99) — attribution d'XP coach/prof (partner-ecosystem §4.5).
// Garde: partner_staff.role IN (coach,teacher) + partners.can_award_xp.
// Cap 500 XP/ado/semaine/awarder appliqué avant insert.

const GrantSchema = z.object({
  teen_id: z.string().uuid(),
  amount_xp: z.number().int().positive().max(500),
  category: z.enum(["school", "sport", "crea"]),
  reason: z.string().max(500).optional(),
  evidence_url: z.string().url().optional(),
})

const WEEK_CAP = 500

export async function POST(req: Request) {
  const supabase = await createClient()

  const { data: auth } = await supabase.auth.getUser()
  if (!auth?.user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 })
  }

  const parsed = GrantSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "validation", details: parsed.error.flatten() }, { status: 422 })
  }
  const { teen_id, amount_xp, category, reason, evidence_url } = parsed.data

  // Awarder = staff coach/teacher actif d'un partenaire autorisé
  const { data: staff } = await supabase
    .from("partner_staff")
    .select("id, partner_id, role, is_active, partners(can_award_xp)")
    .eq("user_id", auth.user.id)
    .eq("is_active", true)
    .in("role", ["coach", "teacher"])
    .maybeSingle()

  if (!staff || !(staff as any).partners?.can_award_xp) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 })
  }

  // Cap hebdo par-ado-par-awarder (500 XP / 7 jours glissants)
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const { data: recent } = await supabase
    .from("partner_xp_awards")
    .select("amount_xp")
    .eq("staff_id", staff.id)
    .eq("teen_id", teen_id)
    .gte("awarded_at", weekAgo)

  const used = (recent ?? []).reduce((s, r: { amount_xp: number }) => s + (r.amount_xp || 0), 0)
  if (used + amount_xp > WEEK_CAP) {
    return NextResponse.json(
      { error: "weekly_cap_exceeded", used, cap: WEEK_CAP, remaining: Math.max(0, WEEK_CAP - used) },
      { status: 409 },
    )
  }

  const { data: inserted, error } = await supabase
    .from("partner_xp_awards")
    .insert({
      partner_id: staff.partner_id,
      staff_id: staff.id,
      teen_id,
      amount_xp,
      category,
      reason: reason ?? null,
      evidence_url: evidence_url ?? null,
      parent_review_status: "pending",
    })
    .select("id")
    .single()

  if (error) {
    return NextResponse.json({ error: "insert_failed", message: error.message }, { status: 500 })
  }

  // L'attribution effective d'XP (add_xp_to_user) intervient à l'expiration de
  // la fenêtre d'auto-approbation parentale (job/cron), pas ici.
  return NextResponse.json({ ok: true, award_id: inserted.id, status: "pending" }, { status: 201 })
}
