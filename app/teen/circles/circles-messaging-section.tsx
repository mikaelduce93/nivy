"use client"

import { useRouter } from "next/navigation"
import { CirclesList } from "@/components/circles"

/**
 * #60 — entry point for the circle-messaging backend (distinct from the
 * gamification "crews" stack above). Lists the teen's circles and routes each
 * selection to the chat detail route, mounting the previously-orphaned
 * CircleChat. Option A from the issue (CirclesList → /teen/circles/[circleId]).
 */
export function CirclesMessagingSection({ teenId }: { teenId: string }) {
  const router = useRouter()
  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-24">
      <p className="eyebrow mb-4">Cercles de discussion</p>
      <CirclesList
        teenId={teenId}
        onSelectCircle={(circleId) => router.push(`/teen/circles/${circleId}`)}
      />
    </section>
  )
}
