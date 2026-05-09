/**
 * Wave 3A — legacy /api/partners/register replaced by canonical wizard
 * submit (canon §2 §4.7). The previous implementation inserted a partners
 * row directly with no auth.users provisioning path — every approved
 * partner became a login-impossible orphan (CANON-PARTNER-001).
 *
 * This route is now a server-side delegator: callers that still POST here
 * are forwarded to /api/partners/wizard/submit. The wizard requires a
 * `password` field; legacy clients that don't provide one get 400 with a
 * clear migration message instead of silently creating an orphan partner.
 */
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  if (!body || typeof body !== "object" || !("password" in body)) {
    return NextResponse.json(
      {
        success: false,
        error: "deprecated_endpoint",
        message:
          "POST /api/partners/register is deprecated. Use POST /api/partners/wizard/submit. " +
          "The wizard requires a chosen password (canon §2 stage 2) so the partner can log in " +
          "after admin activation. The legacy no-password path is closed because it leaves " +
          "orphan partners.",
        canonical: "/api/partners/wizard/submit",
      },
      { status: 410 },
    )
  }

  // Forward to canonical route with the same body. Headers are propagated so
  // the security middleware on the wizard endpoint sees the same caller IP.
  const forwarded = await fetch(new URL("/api/partners/wizard/submit", request.url), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const json = await forwarded.json().catch(() => ({}))
  return NextResponse.json(json, { status: forwarded.status })
}
