import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — /partner/profile → /partner/settings
// (routing.locked.md §4 #32).
export default function PartnerProfileRedirect() {
  redirect("/partner/settings")
}
