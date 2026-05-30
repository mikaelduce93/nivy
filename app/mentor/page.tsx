import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — /mentor index → /mentor/dashboard (cohérence rôles,
// routing.locked.md §6 #8).
export default function MentorIndexPage() {
  redirect("/mentor/dashboard")
}
