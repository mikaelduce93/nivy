import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import AmbassadorApplicationForm from "@/components/ambassador-application-form"
import { CheckCircle2 } from "lucide-react"

export default async function AmbassadorApplicationPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/devenir-ambassadeur/candidature")
  }

  const { data: existingApplication } = await supabase
    .from("ambassadors")
    .select("*")
    .eq("profile_id", user.id)
    .single()

  if (existingApplication) {
    redirect("/devenir-ambassadeur")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-8">Candidature Ambassadeur</h1>

          <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 rounded-3xl p-8 border border-zinc-800 mb-8">
            <h2 className="text-2xl font-bold text-white mb-6">Ce qu'on recherche</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-400">
                  Adolescents actifs sur les réseaux sociaux (Instagram, TikTok, Snapchat)
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-400">Passionnés par l'animation, la musique, ou l'événementiel</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-400">Bonne communication et capacité à promouvoir nos événements</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
                <span className="text-zinc-400">Disponibilité pour participer aux événements</span>
              </li>
            </ul>
          </div>

          <AmbassadorApplicationForm profile={profile} />
        </div>
      </div>
    </div>
  )
}
