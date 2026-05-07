import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AllowanceForm } from "@/components/parent/allowance-form"

export const dynamic = "force-dynamic"

export default async function NewAllowancePage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") redirect("/login")

  const supabase = await createClient()
  const { data: links } = await supabase
    .from("parent_teen_links")
    .select("teen_id, profiles:teen_id (full_name)")
    .eq("parent_id", userInfo.profileId)

  const teens = (links ?? []).map((l) => {
    const profile = (l as { profiles?: { full_name?: string } | null }).profiles
    return {
      id: l.teen_id as string,
      name: profile?.full_name ?? l.teen_id,
    }
  })

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Nouvelle allowance</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Configure un top-up récurrent (hebdomadaire, bimensuel, mensuel, ou
        dates personnalisées).
      </p>
      <AllowanceForm teens={teens} />
    </div>
  )
}
