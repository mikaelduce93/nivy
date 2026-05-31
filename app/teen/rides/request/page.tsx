import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { RequestRideForm } from "./request-form"
import { H1 } from "@/components/ui/headings"
import { NivCoach } from "@/components/brand"

export const dynamic = "force-dynamic"

interface SP {
  searchParams: Promise<{ eventId?: string }>
}

export default async function TeenRidesRequestPage({ searchParams }: SP) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const sp = await searchParams
  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-4 pt-6 md:p-8">
      <div>
        <p className="eyebrow tracking-[0.16em] mb-1">Mobilité</p>
        <H1 className="font-display text-4xl font-extrabold tracking-tight">
          Réserve ton <em className="font-semibold italic text-pink">trajet</em>
        </H1>
        <p className="mt-2 text-sm text-mute">
          Ton parent reçoit une demande à valider avant que la course parte.
        </p>
      </div>
      <NivCoach
        mood="calm"
        message="Pas de stress : ton parent reçoit la demande et valide avant que ton chauffeur arrive. Tu peux choisir « partagé avec le parent » pour le paiement."
      />
      <RequestRideForm eventId={sp.eventId ?? null} />
    </div>
  )
}
