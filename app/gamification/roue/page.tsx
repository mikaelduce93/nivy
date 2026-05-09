// Wave 2B — canon §2 (routing.locked.md): /gamification/roue is 410-gone.
// wheel_streaks trigger broken; wheel feature retired pending founder ratification.
import { permanentRedirect } from "next/navigation"

export const dynamic = "force-static"

export const metadata = {
  robots: { index: false, follow: false },
}

export default function GamificationRoueRedirect(): never {
  permanentRedirect("/teen")
}
