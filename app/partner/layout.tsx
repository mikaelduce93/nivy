import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { PartnerSidebar } from "@/components/dashboard/partner/sidebar"
import { PartnerHeader } from "@/components/dashboard/partner/header"
import { AgentFloatingButton } from "@/components/ai/AgentFloatingButton"

export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "partner") {
    redirect("/auth/redirect")
  }

  return (
    <div className="min-h-screen bg-background">
      <PartnerHeader userInfo={userInfo} />
      <div className="flex">
        <PartnerSidebar />
        <main className="flex-1 p-4 md:p-8 lg:p-10 md:ml-64 pt-24">
          {children}
        </main>
      </div>
      <AgentFloatingButton role="partner" context={userInfo.partnerData} />
    </div>
  )
}
