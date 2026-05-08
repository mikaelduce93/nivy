import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { RequestRideForm } from "./request-form"

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
        <h1 className="text-2xl font-bold">Réserver un trajet</h1>
        <p className="text-muted-foreground text-sm">
          Votre parent recevra une demande à approuver avant que la course parte.
        </p>
      </div>
      <RequestRideForm eventId={sp.eventId ?? null} />
    </div>
  )
}
