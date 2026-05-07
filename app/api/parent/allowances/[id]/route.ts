import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    return NextResponse.json({ success: false, error: "Non autorisé" }, { status: 401 })
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from("parent_allowances")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("parent_id", userInfo.profileId)
    .select("*")
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json(
      { success: false, error: error?.message ?? "Allowance introuvable" },
      { status: 404 }
    )
  }
  return NextResponse.json({ success: true, data })
}
