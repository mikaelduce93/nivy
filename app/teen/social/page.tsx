import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import { SocialHubClient } from "./social-hub-client"

export default async function SocialHubPage() {
  const userInfo = await getUserRole()
  
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<SocialHubSkeleton />}>
        <SocialHubClient teenId={teenId} teenName={userInfo.teenData?.full_name || "Friend"} />
      </Suspense>
    </div>
  )
}

function SocialHubSkeleton() {
  return (
    <div className="space-y-8 pt-8 animate-pulse">
      <div className="h-12 bg-zinc-800/50 rounded-2xl w-full max-w-md" />
      <div className="h-64 bg-zinc-800/30 rounded-3xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-zinc-800/30 rounded-3xl" />
        ))}
      </div>
    </div>
  )
}
