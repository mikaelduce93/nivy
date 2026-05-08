import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { ParentSidebar } from "@/components/dashboard/parent/sidebar"
import { ParentHeader } from "@/components/dashboard/parent/header"
import { AgentFloatingButton } from "@/components/ai/AgentFloatingButton"
import { ParentMobileDock } from "@/components/layouts/parent-mobile-dock"
import { createClient } from "@/lib/supabase/server"
import { SkipToContent } from "@/components/ui/skip-to-content"

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  // Fetch pending approvals count for badge
  const supabase = await createClient()
  const { count: pendingCount } = await supabase
    .from("parental_approvals")
    .select("*", { count: "exact", head: true })
    .eq("parent_id", userInfo.profileId)
    .eq("status", "pending")

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <ParentHeader userInfo={userInfo} />
      <div className="flex">
        <ParentSidebar userInfo={userInfo} />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-8 lg:p-10 md:ml-64 pt-24 pb-32 md:pb-10 outline-none"
        >
          {children}
        </main>
      </div>
      <AgentFloatingButton role="parent" context={userInfo.parentData} />
      <ParentMobileDock pendingCount={pendingCount || 0} />
    </div>
  )
}
