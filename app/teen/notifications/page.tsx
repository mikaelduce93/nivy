import { redirect } from "next/navigation"

// Refonte V1.5 (#109) — l'inbox ado canonique est /teen/activity
// (routing.locked.md §6 #4 : la requête /teen/notifications est abandonnée
// au profit de /teen/activity, déjà en place).
export default function TeenNotificationsRedirect() {
  redirect("/teen/activity")
}
