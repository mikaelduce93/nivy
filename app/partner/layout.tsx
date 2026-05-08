import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { PartnerSidebar } from "@/components/dashboard/partner/sidebar"
import { PartnerHeader } from "@/components/dashboard/partner/header"
import { AgentFloatingButton } from "@/components/ai/AgentFloatingButton"
import { SkipToContent } from "@/components/ui/skip-to-content"

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
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <PartnerHeader userInfo={userInfo} />
      <div className="flex">
        <PartnerSidebar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-8 lg:p-10 md:ml-64 pt-24 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 outline-none"
        >
          {children}
        </main>
      </div>
      <AgentFloatingButton role="partner" context={userInfo.partnerData} />
    </div>
  )
}
