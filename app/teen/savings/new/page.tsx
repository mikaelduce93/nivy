import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { GoalForm } from "@/components/teen/goal-form"

export const dynamic = "force-dynamic"

export default async function NewGoalPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") redirect("/login")

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-xl">
      <h1 className="text-2xl font-bold mb-2">Nouvel objectif</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Donne un nom à ce que tu veux acheter et combien de coins il te faut.
      </p>
      <GoalForm />
    </div>
  )
}
