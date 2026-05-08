import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { DashboardHeader } from "@/components/dashboard/header"
import { SkipToContent } from "@/components/ui/skip-to-content"

export const metadata: Metadata = {
  title: {
    template: "%s | Dashboard - Teens Party Morocco",
    default: "Dashboard - Teens Party Morocco",
  },
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <DashboardHeader user={user} profile={profile} />
      <div className="flex">
        <DashboardSidebar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-6 lg:p-8 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
