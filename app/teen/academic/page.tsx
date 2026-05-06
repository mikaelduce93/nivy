// REDIRECT: /teen/academic was a near-line-for-line duplicate of /teen/aide-scolaire
// (verified by orchestrator audit at SHA 6e3e7f2 — only delta was the TODO comment).
// Canonical version is /teen/aide-scolaire which is part of the teen layout shell.
import { redirect } from "next/navigation"

export default function AcademicPage() {
  redirect("/teen/aide-scolaire")
}
