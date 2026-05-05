"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Database, ExternalLink, FileText, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from "next/link"
import BackButton from "@/components/admin/BackButton"

// L'ID projet Supabase est resolu cote client uniquement via NEXT_PUBLIC_*.
// Si NEXT_PUBLIC_SUPABASE_PROJECT_ID est defini, on l'utilise; sinon on tente
// de l'extraire de NEXT_PUBLIC_SUPABASE_URL (https://<id>.supabase.co).
function getSupabaseProjectId(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID
  if (explicit) return explicit
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) return null
  const match = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i)
  return match ? match[1] : null
}

const SUPABASE_PROJECT_ID = getSupabaseProjectId()
const SUPABASE_SQL_EDITOR_URL = SUPABASE_PROJECT_ID
  ? `https://supabase.com/dashboard/project/${SUPABASE_PROJECT_ID}/sql/new`
  : "https://supabase.com/dashboard"

const SCRIPTS = [
  {
    id: "105",
    name: "105_create_djs_and_campaigns.sql",
    description: "Tables DJs, Galerie, Blog, FAQ, Témoignages",
    path: "/scripts/105_create_djs_and_campaigns.sql"
  },
  {
    id: "106",
    name: "106_seed_djs_and_content.sql",
    description: "Données de démonstration (4 DJs, blog, FAQ)",
    path: "/scripts/106_seed_djs_and_content.sql"
  },
  {
    id: "107",
    name: "107_add_critical_rls_policies.sql",
    description: "Policies RLS sécurité critiques",
    path: "/scripts/107_add_critical_rls_policies.sql"
  },
  {
    id: "108",
    name: "108_add_operational_features.sql",
    description: "Check-in amélioré, E-signature, Purge RGPD",
    path: "/scripts/108_add_operational_features.sql"
  },
  {
    id: "109",
    name: "109_add_morocco_payments.sql",
    description: "CMI, Mobile Money, Cash ambassadeurs",
    path: "/scripts/109_add_morocco_payments.sql"
  },
]

export default function SQLScriptsPage() {
  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-32">
        <BackButton href="/admin" label="Retour au dashboard" />
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4 flex items-center gap-4">
            <Database className="w-12 h-12 text-cyan-400" />
            Scripts SQL à Exécuter
          </h1>
          <p className="text-zinc-400 text-lg">
            Ces scripts doivent être exécutés manuellement dans Supabase pour activer toutes les fonctionnalités.
          </p>
        </div>

        <Card className="bg-gradient-to-br from-blue-900/20 to-cyan-900/20 border-blue-500/30 mb-8">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-blue-400" />
              Pourquoi exécuter manuellement ?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-zinc-300 space-y-3">
            <p>
              Pour des raisons de sécurité, Supabase n'autorise pas l'exécution de SQL arbitraire depuis les applications clientes.
            </p>
            <p className="font-semibold text-white">
              Vous devez copier-coller ces scripts dans le SQL Editor de Supabase.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Accéder au SQL Editor</CardTitle>
            <CardDescription>
              Ouvrez le SQL Editor de Supabase pour exécuter les scripts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-14"
            >
              <a href={SUPABASE_SQL_EDITOR_URL} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-5 h-5 mr-3" />
                Ouvrir Supabase SQL Editor
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800 mb-8">
          <CardHeader>
            <CardTitle className="text-white">Scripts à exécuter dans l'ordre</CardTitle>
            <CardDescription>
              Copiez le contenu de chaque script et collez-le dans le SQL Editor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {SCRIPTS.map((script, index) => (
                <div
                  key={script.id}
                  className="p-4 bg-zinc-900 rounded-xl border border-zinc-800"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                      <span className="text-cyan-400 font-bold">{index + 1}</span>
                    </div>

                    <div className="flex-1">
                      <h3 className="text-white font-semibold flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        {script.name}
                      </h3>
                      <p className="text-zinc-400 text-sm mt-1">{script.description}</p>
                      <p className="text-zinc-500 text-xs mt-2 font-mono">
                        Fichier: scripts/{script.name}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-400" />
              Instructions étape par étape
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ol className="text-zinc-300 space-y-3 list-decimal list-inside">
              <li>Cliquez sur le bouton "Ouvrir Supabase SQL Editor" ci-dessus</li>
              <li>Copiez le contenu du fichier <code className="text-cyan-400">scripts/105_create_djs_and_campaigns.sql</code></li>
              <li>Collez-le dans l'éditeur SQL et cliquez sur "Run"</li>
              <li>Attendez la confirmation d'exécution</li>
              <li>Répétez pour les scripts 106, 107, 108 et 109 <strong>dans cet ordre</strong></li>
            </ol>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-6">
              <p className="text-amber-300 text-sm flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Important:</strong> Si vous voyez l'erreur "relation already exists", c'est normal - 
                  cela signifie que la table existe déjà. Continuez simplement avec le script suivant.
                </span>
              </p>
            </div>

            <div className="mt-6">
              <Link href="/docs/EXECUTER_SCRIPTS_SQL.md">
                <Button variant="outline" className="border-zinc-700 text-zinc-300">
                  <FileText className="w-4 h-4 mr-2" />
                  Voir le guide complet
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
