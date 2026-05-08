/**
 * Wave Ops-D — Admin manual top-up listing.
 *
 * GET /api/admin/topups?status=pending|confirmed|rejected&limit=50
 *   List manual top-up requests for the admin dashboard. Joins parent +
 *   teen names from profiles for display.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(): Promise<
  { ok: true; userId: string } | { ok: false; res: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 }),
    }
  }
  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return {
      ok: false,
      res: NextResponse.json({ success: false, error: "forbidden" }, { status: 403 }),
    }
  }
  return { ok: true, userId: user.id }
}

export async function GET(req: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.res

  const url = new URL(req.url)
  const status = url.searchParams.get("status") ?? "pending"
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200)

  const sr = createServiceRoleClient()
  const { data, error } = await sr
    .from("manual_topup_requests")
    .select(`
      id, parent_id, teen_id, amount_dh, provider, provider_ref,
      screenshot_path, status, payment_transaction_id, rejection_reason,
      decided_by, decided_at, created_at, updated_at,
      parent:profiles!manual_topup_requests_parent_id_fkey(full_name, email, phone),
      teen:profiles!manual_topup_requests_teen_id_fkey(full_name, email)
    `)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[admin/topups] list error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  const { data: threshold } = await sr.rpc("manual_topup_threshold_status")

  return NextResponse.json({
    success: true,
    requests: data ?? [],
    threshold: threshold ?? null,
  })
}
