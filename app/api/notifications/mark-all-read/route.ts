/**
 * Wave 6D — legacy /api/notifications/mark-all-read is GONE.
 *
 * Same reason as the singular `mark-read`: wrote to the deprecated
 * `notifications` table, redirected to a redirect stub, no callers.
 * Per-role canonical lives under /api/parent/notifications/mark-all-read
 * (Wave 6D) for the parent surface.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-static"

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "Legacy notifications endpoint removed. Per-role canonical: /api/parent/notifications/mark-all-read (parent).",
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
