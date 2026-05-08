import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { MentorSidebar } from "@/components/dashboard/mentor/sidebar"
import { MentorHeader } from "@/components/dashboard/mentor/header"
import { SkipToContent } from "@/components/ui/skip-to-content"

export default async function MentorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "mentor") {
    return (
      <div className="min-h-screen bg-[#030303] text-white flex items-center justify-center p-10">
        <div className="max-w-md text-center">
          <h1 className="text-4xl font-black mb-4">Accès refusé</h1>
          <p className="text-zinc-400 mb-6">
            Cette section est réservée aux mentors validés. Si vous pensez qu'il s'agit d'une
            erreur, contactez le support.
          </p>
          <a
            href="/auth/redirect"
            className="inline-block px-6 py-3 rounded-2xl bg-white text-black font-black"
          >
            Retour
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* TICKET-049: keyboard skip-link must be the FIRST focusable element. */}
      <SkipToContent />
      <MentorHeader userInfo={userInfo} />
      <div className="flex">
        <MentorSidebar />
        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 md:p-8 lg:p-10 md:ml-64 pt-24 outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  )
}
