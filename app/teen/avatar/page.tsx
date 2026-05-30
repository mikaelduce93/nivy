import type { Metadata } from "next"
import { AvatarClient } from "./avatar-client"

export const metadata: Metadata = {
  title: "Mon avatar Niv",
}

// Refonte V1.5 (#103) — personnalisation de l'avatar/coach Niv (skins, humeur).
export default function TeenAvatarPage() {
  return <AvatarClient />
}
