import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivCoach } from "@/components/brand"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
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
    <div className="min-h-screen bg-paper">
      <div className="container mx-auto px-6 py-32 max-w-xl">
        <Button variant="ghost" asChild className="mb-6 text-mute hover:text-ink">
          <Link href="/parent/allowances">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Link>
        </Button>

        <div className="mb-8">
          <p className="eyebrow text-pink">Configurer</p>
          <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-ink">
            Nouvelle <em className="font-semibold italic text-pink">allowance</em>
          </h1>
          <p className="mt-2 text-mute">
            Configure un top-up récurrent (hebdomadaire, bimensuel, mensuel, ou
            dates personnalisées).
          </p>
        </div>

        <div className="space-y-6">
          <NivCoach
            mood="calm"
            message="Choisis le montant et la cadence — je m'occupe des versements."
          />
          <StickerCard className="p-6">
            <AllowanceForm teens={teens} />
          </StickerCard>
        </div>
      </div>
    </div>
  )
}
