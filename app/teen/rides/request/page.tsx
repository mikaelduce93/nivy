import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { RequestRideForm } from "./request-form"
import { H1 } from "@/components/ui/headings"

export const dynamic = "force-dynamic"

interface SP {
  searchParams: Promise<{ eventId?: string }>
}

export default async function TeenRidesRequestPage({ searchParams }: SP) {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")
  const sp = await searchParams
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl space-y-6">
      <div>
        <H1 className="text-4xl font-black tracking-tighter uppercase leading-none">
          Réserver un trajet
        </H1>
        <p className="text-muted-foreground text-sm mt-2">
          Votre parent recevra une demande à approuver avant que la course parte.
        </p>
      </div>
      <RequestRideForm eventId={sp.eventId ?? null} />
    </div>
  )
}
