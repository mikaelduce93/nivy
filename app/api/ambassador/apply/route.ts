import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

/**
 * Ambassador candidature intake from /devenir-ambassadeur/candidature.
 *
 * Inserts a row against the REAL ambassadors schema (user_id, code NOT NULL
 * UNIQUE, status, track, tier, commission_pct) — the old client insert targeted
 * removed columns (profile_id/stage_name/bio/social_media/specialties/video_url)
 * and always failed. The ambassadors table has no narrative columns, so the
 * application answers (incl. the required "pourquoi") are persisted in audit_log
 * for admin review.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: {
    stageName?: string
    bio?: string
    socialMedia?: Record<string, string>
    specialties?: string[]
    whyAmbassador?: string
    videoUrl?: string | null
  }
  try {
    body = await request.json()
  } catch {
    body = {}
  }

  const sr = createServiceRoleClient()

  // One ambassador row per user (UNIQUE user_id). Re-submission is rejected
  // honestly rather than overwriting an existing (possibly active) row.
  const { data: existing } = await sr
    .from("ambassadors")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json(
      { error: "already_applied", status: (existing as { status?: string }).status },
      { status: 409 },
    )
  }

  const code = "AMB-" + randomBytes(4).toString("hex").toUpperCase()
  const { error: insErr } = await sr.from("ambassadors").insert({
    user_id: user.id,
    code,
    status: "pending",
    track: "cash",
    tier: "bronze",
    commission_pct: 10,
  })
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  await sr.from("audit_log").insert({
    action: "ambassador.application",
    resource_type: "ambassador",
    target_user_id: user.id,
    description: "Candidature ambassadeur",
    metadata: {
      code,
      stage_name: body.stageName ?? null,
      bio: body.bio ?? null,
      social_media: body.socialMedia ?? null,
      specialties: body.specialties ?? null,
      why: body.whyAmbassador ?? null,
      video_url: body.videoUrl ?? null,
    },
  })

  return NextResponse.json({ success: true, code })
}
