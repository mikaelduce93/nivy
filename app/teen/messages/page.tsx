import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { Suspense } from "react"
import { MessagesClient } from "./messages-client"
import { getConversations } from "@/features/messages/actions"

export default async function MessagesPage() {
  const userInfo = await getUserRole()

  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }

  const conversations = await getConversations().catch(() => [])

  const props = JSON.parse(JSON.stringify({ conversations }))

  return (
    <div className="min-h-screen pb-32">
      <Suspense fallback={<MessagesSkeleton />}>
        <MessagesClient
          conversations={props.conversations}
          currentUserId={userInfo.teenData?.id ?? userInfo.profileId}
        />
      </Suspense>
    </div>
  )
}

function MessagesSkeleton() {
  return (
    <div className="space-y-4 pt-6 animate-pulse">
      <div className="h-14 bg-zinc-800/50 rounded-2xl w-64" />
      <div className="h-12 bg-zinc-800/30 rounded-xl" />
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-20 bg-zinc-800/30 rounded-2xl" />
      ))}
    </div>
  )
}
