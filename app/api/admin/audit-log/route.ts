/**
 * Wave V1.2-E — Admin: read admin_audit_logs.
 *
 * GET /api/admin/audit-log
 *   Query params (all optional):
 *     user_id        uuid          actor user_id (admin who took action)
 *     action         text          exact action match (e.g. 'refund.issue')
 *     target_type    text          e.g. 'partner', 'marketplace', 'user'
 *     target_id      uuid          row affected
 *     from           ISO 8601      created_at >=
 *     to             ISO 8601      created_at <=
 *     limit          int           default 50, max 200
 *     offset         int           default 0
 *
 * Auth: admin / super_admin / moderator only.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authErr,
  } = await supabase.auth.getUser()
  if (authErr || !user) {
    return NextResponse.json({ success: false, error: "unauthenticated" }, { status: 401 })
  }

  const sr = createServiceRoleClient()
  const { data: role } = await sr
    .from("admin_roles")
    .select("role")
    .eq("profile_id", user.id)
    .maybeSingle()
  if (!role || !["admin", "super_admin", "moderator"].includes(role.role)) {
    return NextResponse.json({ success: false, error: "forbidden" }, { status: 403 })
  }

  const url = new URL(req.url)
  const filters = {
    user_id: url.searchParams.get("user_id") || null,
    action: url.searchParams.get("action") || null,
    target_type: url.searchParams.get("target_type") || null,
    target_id: url.searchParams.get("target_id") || null,
    from: url.searchParams.get("from") || null,
    to: url.searchParams.get("to") || null,
  }
  const limit = Math.min(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 200)
  const offset = Math.max(parseInt(url.searchParams.get("offset") || "0", 10) || 0, 0)

  let q = sr
    .from("admin_audit_logs")
    .select("id, user_id, action, target_type, target_id, payload, ip_address, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.user_id) q = q.eq("user_id", filters.user_id)
  if (filters.action) q = q.eq("action", filters.action)
  if (filters.target_type) q = q.eq("target_type", filters.target_type)
  if (filters.target_id) q = q.eq("target_id", filters.target_id)
  if (filters.from) q = q.gte("created_at", filters.from)
  if (filters.to) q = q.lte("created_at", filters.to)

  const { data, error, count } = await q
  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    rows: data ?? [],
    total: count ?? 0,
    limit,
    offset,
    filters,
  })
}
