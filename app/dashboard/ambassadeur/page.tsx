import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AmbassadorDashboardClient } from "@/components/ambassador-dashboard-client"

export default async function AmbassadorDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/dashboard/ambassadeur")
  }

  const { data: ambassador } = await supabase.from("ambassadors").select("*").eq("profile_id", user.id).single()

  if (!ambassador || ambassador.status !== "active") {
    redirect("/ambassadeurs")
  }

  // Get referrals with more details
  const { data: referrals } = await supabase
    .from("referral_usage")
    .select(`
      *,
      bookings (
        id,
        booking_reference,
        total_price,
        payment_status,
        created_at,
        events (
          title,
          city
        )
      )
    `)
    .eq("ambassador_id", ambassador.id)
    .order("created_at", { ascending: false })

  return <AmbassadorDashboardClient ambassador={ambassador} referrals={referrals || []} />
}
