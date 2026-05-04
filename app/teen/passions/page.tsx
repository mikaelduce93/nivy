// REDIRECT: /teen/passions now redirects to /teen/quests?tab=creative
import { redirect } from "next/navigation"

export default function PassionsPage() {
  redirect("/teen/quests?tab=creative")
}
