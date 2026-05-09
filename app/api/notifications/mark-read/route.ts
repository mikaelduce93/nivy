/**
 * Wave 6D — legacy /api/notifications/mark-read is GONE.
 *
 * The previous implementation wrote to the deprecated `notifications`
 * table (canonical: `user_notifications`) and redirected to /notifications,
 * which is itself a Wave 5A redirect stub to /auth/redirect. The endpoint
 * had zero callers in app/ or components/.
 *
 * Per-role canonical replacements:
 *   - parent: handled by /api/parent/notifications/mark-read (Wave 6D).
 *   - teen:   handled by the teen activity surface (Wave 1.4 personalization).
 */
import { NextResponse } from "next/server"

export const dynamic = "force-static"

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "Legacy notifications endpoint removed. Per-role canonical: /api/parent/notifications/mark-read (parent), /teen/activity (teen).",
    },
    { status: 410 },
  )
}

export async function GET() {
  return gone()
}

export async function POST() {
  return gone()
}
