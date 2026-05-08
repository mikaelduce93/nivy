import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { AmbassadorSidebar } from "@/components/dashboard/ambassador/sidebar"
import { AmbassadorHeader } from "@/components/dashboard/ambassador/header"
import { AgentFloatingButton } from "@/components/ai/AgentFloatingButton"
import { SkipToContent } from "@/components/ui/skip-to-content"

export default async function AmbassadorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "ambassador") {
    redirect("/auth/redirect")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <AmbassadorHeader userInfo={userInfo} />
      <div className="flex">
        <AmbassadorSidebar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-6 md:ml-64 outline-none"
        >
          {children}
        </main>
      </div>
      <AgentFloatingButton role="ambassador" context={userInfo.ambassadorData} />
    </div>
  )
}
