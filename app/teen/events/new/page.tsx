/**
 * /teen/events/new — Create a teen event (V6, issue #237, Flow A).
 *
 * Server component: gates on the teen role and renders the create-event client
 * form. Submitting calls create_teen_event via POST /api/teen/events/groups
 * { action:'createEvent' } — the event lands in `pending_review` (moderation).
 * Charte paper hero + NivCoach, mirroring /teen/rides/groups/new.
 */
import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { H1 } from "@/components/ui/headings"
import { NivCoach } from "@/components/brand"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { CreateEventForm } from "./create-form"

export const dynamic = "force-dynamic"

export default async function NewTeenEventPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <Link
          href="/teen/events/groups"
          className="inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.12em] text-mute hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Réservations groupées
        </Link>
      </div>
      <div>
        <p className="eyebrow tracking-[0.16em] mb-1">Évènements</p>
        <H1 className="font-display text-4xl font-extrabold tracking-tight">
          Crée un <em className="font-semibold italic text-pink">évènement</em>
        </H1>
        <p className="mt-2 text-sm text-mute">
          Propose ta sortie : un concert, un tournoi, un atelier… Une fois validé
          par l&apos;équipe, tes amis pourront le réserver en groupe.
        </p>
      </div>
      <NivCoach
        mood="happy"
        message="Donne tous les détails : titre, date, ville et prix par place en coins. Ton évènement passe en relecture avant d'être visible — ensuite tu pourras ouvrir une réservation groupée."
      />
      <CreateEventForm />
    </div>
  )
}
