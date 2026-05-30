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
      <h2 className="mb-4 text-lg font-bold text-ink">Cercles de discussion</h2>
      <CirclesList
        teenId={teenId}
        onSelectCircle={(circleId) => router.push(`/teen/circles/${circleId}`)}
      />
    </section>
  )
}
