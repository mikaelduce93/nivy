import { NextResponse } from "next/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const runtime = "nodejs"

/**
 * Event-talent (DJ / performer) candidature intake from /devenir-dj/candidature.
 *
 * The lightweight funnel form (name/email/phone/message) does not carry the
 * company_name + password the partner wizard requires, and there is no
 * dedicated talent-applications table in canon — so the lead is persisted in
 * audit_log for the admin team to triage. Returns a real 2xx only on success
 * (the candidature form surfaces an honest error otherwise).
 */
export async function POST(request: Request) {
  let body: { name?: string; email?: string; phone?: string; message?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 })
  }

  const name = (body.name ?? "").trim()
  const email = (body.email ?? "").trim()
  if (!name || !email) {
    return NextResponse.json({ error: "name_and_email_required" }, { status: 400 })
  }

  const sr = createServiceRoleClient()
  const { error } = await sr.from("audit_log").insert({
    action: "talent.application",
    resource_type: "event_talent",
    description: `Candidature talent événementiel — ${name}`,
    metadata: {
      name,
      email,
      phone: body.phone ?? null,
      message: body.message ?? null,
    },
  })
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
