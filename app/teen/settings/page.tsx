// REDIRECT: /teen/settings now redirects to /teen/profile?tab=settings
import { redirect } from "next/navigation"

export default function SettingsPage() {
  redirect("/teen/profile?tab=settings")
}
