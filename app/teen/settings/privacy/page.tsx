import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — les réglages teen sont consolidés dans l'onglet
// /teen/profile?tab=settings (routing.locked.md §4 #34).
export default function TeenSettingsPrivacyRedirect() {
  redirect("/teen/profile?tab=settings")
}
