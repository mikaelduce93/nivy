// REDIRECT: /teen/map now redirects to /teen/social?tab=map
import { redirect } from "next/navigation"

export default function MapPage() {
  redirect("/teen/social?tab=map")
}
