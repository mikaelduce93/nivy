"use client"

import { useRouter } from "next/navigation"
import { CircleChat } from "@/components/circles"

interface CircleInfo {
  id: string
  name: string
  description?: string
  avatar_url?: string
  theme_color: string
  emoji?: string
  member_count: number
}

/**
 * #60 — client wrapper that mounts the orphaned CircleChat component and wires
 * onBack to the circles list. Settings/members panels are optional and left
 * out for now (CircleChat declares them with `?`).
 */
export function CircleChatClient({
  circleId,
  teenId,
  circleInfo,
}: {
  circleId: string
  teenId: string
  circleInfo: CircleInfo
}) {
  const router = useRouter()
  return (
    <CircleChat
      circleId={circleId}
      teenId={teenId}
      circleInfo={circleInfo}
      onBack={() => router.push("/teen/circles")}
    />
  )
}
