/**
 * Wave 2B — legacy /api/teen/shop is GONE.
 * Canonical shop surface is /teen/wallet?tab=shop, which queries
 * `shop_rewards` and writes via the SECURITY DEFINER `purchase_reward` RPC.
 *
 * The legacy implementation here read/wrote the deprecated `shop_items` table
 * and the phantom `deduct_user_xp` RPC (CANON-SHOP-001 + CANON-XP-002).
 * Removed without redirect because no app code calls this endpoint.
 */
import { NextResponse } from "next/server"

export const dynamic = "force-static"

function gone() {
  return NextResponse.json(
    {
      error: "gone",
      message:
        "Legacy shop endpoint removed. Use /teen/wallet?tab=shop and the purchase_reward RPC.",
    },
    { status: 410 }
  )
}

export async function GET() {
  return gone()
}

export async function POST() {
  return gone()
}
