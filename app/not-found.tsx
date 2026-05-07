import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <div className="max-w-md">
        <p className="text-cyan-500 text-sm font-semibold tracking-wide uppercase">
          Erreur 404
        </p>
        <h1 className="mt-2 text-4xl sm:text-5xl font-bold tracking-tight">
          Page introuvable
        </h1>
        <p className="mt-4 text-base text-muted-foreground">
          Le lien que tu as suivi semble cassé, ou la page n&apos;existe plus.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-cyan-600 px-5 py-3 text-sm font-medium text-white hover:bg-cyan-700 transition"
          >
            Retour à l&apos;accueil
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center justify-center rounded-lg border border-border px-5 py-3 text-sm font-medium hover:bg-muted transition"
          >
            Se connecter
          </Link>
        </div>
      </div>
    </main>
  )
}
