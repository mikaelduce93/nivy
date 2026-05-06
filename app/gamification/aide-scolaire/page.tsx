// REDIRECT: /gamification/aide-scolaire now redirects to /teen/aide-scolaire (canonical teen-layout static page;
// both versions were static mocks — teen version chosen as it lives within the authenticated teen shell).
import { redirect } from "next/navigation"

export default function GamificationAideScolairePage() {
  redirect("/teen/aide-scolaire")
}
