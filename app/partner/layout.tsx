import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { PartnerSidebar, type PartnerType } from "@/components/dashboard/partner/sidebar"
import { PartnerHeader } from "@/components/dashboard/partner/header"
import { SkipToContent } from "@/components/ui/skip-to-content"
import { createClient } from "@/lib/supabase/server"

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

  // Wave 3A — load partner_type + status so the sidebar can render the right
  // links per archetype (canon §6 F4) and clamp tools when status≠'active'.
  const supabase = await createClient()
  const { data: partner } = await supabase
    .from("partners")
    .select("partner_type, status")
    .eq("email", userInfo.email)
    .maybeSingle()

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <PartnerHeader
        userInfo={userInfo}
        partnerType={(partner?.partner_type as PartnerType) ?? null}
        partnerStatus={(partner?.status as any) ?? null}
      />
      <div className="flex">
        <PartnerSidebar
          partnerType={(partner?.partner_type as PartnerType) ?? null}
          partnerStatus={(partner?.status as any) ?? null}
        />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-8 lg:p-10 md:ml-64 pt-24 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-10 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
