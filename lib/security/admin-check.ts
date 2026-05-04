import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export async function requireAdmin(allowedRoles: string[] = ["super_admin", "admin", "moderator"]) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: adminRole } = await supabase.from("admin_roles").select("*").eq("profile_id", user.id).single()

  if (!adminRole || !allowedRoles.includes(adminRole.role)) {
    redirect("/")
  }

  return { user, adminRole }
}
