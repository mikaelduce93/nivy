/**
 * /marketplace/sell — create listing form.
 */

import { SellForm } from "./sell-form"

export const dynamic = "force-dynamic"

export default function SellPage() {
  return (
    <main className="min-h-screen mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Vendre un article</h1>
      <p className="text-sm text-gray-600 mb-6">
        Toutes les annonces sont validées avant publication. Pas de coordonnées (téléphone, email, IG/WhatsApp)
        dans le titre ou la description — elles seront rejetées automatiquement.
      </p>
      <SellForm />
    </main>
  )
}
