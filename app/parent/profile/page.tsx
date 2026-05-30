import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — /parent/profile → /parent/settings
// (routing.locked.md §4 #31 : pas de surface profil dédiée parent).
export default function ParentProfileRedirect() {
  redirect("/parent/settings")
}
