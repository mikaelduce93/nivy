import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"

export const metadata = {
  title: "Mon Espace | Teens Party",
  description: "Accédez à votre espace personnel",
}

export default async function EspacePage() {
  const userInfo = await getUserRole()

  if (!userInfo) {
    redirect("/auth/login?redirect=/espace")
  }

  // Redirection selon le rôle
  switch (userInfo.role) {
    case "teen":
      redirect("/teen")
    case "parent":
      redirect("/parent")
    case "ambassador":
      redirect("/ambassador")
    case "partner":
      redirect("/partner")
    case "admin":
      redirect("/admin")
    default:
      // Si rôle inconnu, rediriger vers la page de sélection de rôle
      redirect("/onboarding")
  }
}
