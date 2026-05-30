import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — consolidé dans /teen/profile?tab=settings.
export default function TeenSettingsLanguageRedirect() {
  redirect("/teen/profile?tab=settings")
}
