import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { GoalForm } from "@/components/teen/goal-form"

export const dynamic = "force-dynamic"

export default async function NewGoalPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  return (
    <div className="mx-auto max-w-xl p-4 md:p-8">
      <header className="mb-6 space-y-1">
        <span className="eyebrow tracking-[0.16em] text-mute">Nouvel objectif</span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
          Crée ton <em className="font-semibold italic text-pink">objectif</em>
        </h1>
        <p className="text-sm text-mute">
          Donne un nom à ce que tu veux acheter et combien de coins il te faut.
        </p>
      </header>
      <GoalForm />
    </div>
  )
}
