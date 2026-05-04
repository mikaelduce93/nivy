import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { TeenSidebar } from "@/components/dashboard/teen/sidebar"
import { TeenHeader } from "@/components/dashboard/teen/header"
import { GamificationProvider } from "@/components/gamification/gamification-provider"
import { EliteAICompanion } from "@/components/ai/elite-ai-companion"
import { ClientErrorBoundary } from "@/components/common/client-error-boundary"

export default async function TeenLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login")
  }

  if (userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  return (
    <GamificationProvider initialTeenId={userInfo.teenData?.id}>
      <div className="min-h-screen bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 bg-dots opacity-20" />
        <TeenHeader userInfo={userInfo} />
        <div className="flex relative">
          <TeenSidebar />
          <main className="relative flex-1 p-4 md:p-6 md:ml-64">
            {children}
          </main>
        </div>
        <ClientErrorBoundary>
          <EliteAICompanion 
            role="teen" 
            teenName={userInfo.fullName?.split(' ')[0] || 'Champ'}
            userId={userInfo.teenData?.id}
            context={userInfo.teenData} 
          />
        </ClientErrorBoundary>
      </div>
    </GamificationProvider>
  )
}
