import { createClient } from "@/lib/supabase/server"
import { redirect } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { FileText, Plus, Download, Trash2, Calendar, File, AlertTriangle } from 'lucide-react'

export default async function DocumentsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login?redirect=/profile/documents")
  }

  const { data: documents } = await supabase
    .from("documents")
    .select(`
      *,
      children (prenom, nom)
    `)
    .eq("parent_id", user.id)
    .order("uploaded_at", { ascending: false })

  const documentTypeLabels: Record<string, string> = {
    medical: "Certificat médical",
    identity: "Pièce d'identité",
    vaccination: "Carnet de vaccination",
    authorization: "Autorisation parentale",
    insurance: "Attestation d'assurance",
    other: "Autre document",
  }

  const documentTypeIcons: Record<string, any> = {
    medical: FileText,
    identity: File,
    vaccination: FileText,
    authorization: File,
    insurance: File,
    other: FileText,
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-32">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-black text-white mb-2">Mes documents</h1>
              <p className="text-zinc-400">Gérez les documents de vos enfants</p>
            </div>
            <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white border-0">
              <Link href="/profile/documents/ajouter">
                <Plus className="w-4 h-4 mr-2" />
                Ajouter un document
              </Link>
            </Button>
          </div>

          {/* Adding GDPR purge notice and ready status */}
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-8">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-200 font-semibold mb-1">Politique de conservation RGPD</p>
                <p className="text-xs text-yellow-300/80">
                  Les documents sensibles (CIN, certificats médicaux) sont automatiquement supprimés 30 jours après leur ajout, conformément au RGPD et à la CNDP marocaine.
                </p>
              </div>
            </div>
          </div>

          {documents && documents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => {
                const Icon = documentTypeIcons[doc.document_type] || FileText
                const isExpiringSoon =
                  doc.expiry_date && new Date(doc.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
                const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date()

                return (
                  <Card key={doc.id} className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-white mb-1 truncate">{doc.file_name}</h3>
                          <p className="text-sm text-cyan-400">{documentTypeLabels[doc.document_type]}</p>
                        </div>
                      </div>

                      {doc.children && (
                        <div className="mb-3 pb-3 border-b border-zinc-800">
                          <p className="text-sm text-zinc-500">Enfant</p>
                          <p className="text-white font-semibold">
                            {doc.children.prenom} {doc.children.nom}
                          </p>
                        </div>
                      )}

                      {doc.description && <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{doc.description}</p>}

                      <div className="space-y-2 text-sm mb-4">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar className="w-4 h-4 text-cyan-400" />
                          <span>Ajouté le {new Date(doc.uploaded_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                        {doc.expiry_date && (
                          <div
                            className={`flex items-center gap-2 ${
                              isExpired ? "text-red-400" : isExpiringSoon ? "text-yellow-400" : "text-zinc-400"
                            }`}
                          >
                            <Calendar className="w-4 h-4" />
                            <span>
                              Expire le {new Date(doc.expiry_date).toLocaleDateString("fr-FR")}
                              {isExpired && " (expiré)"}
                              {isExpiringSoon && !isExpired && " (bientôt)"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          asChild
                          size="sm"
                          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0"
                        >
                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" download>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </a>
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="border-red-500 text-red-400 hover:bg-red-500/10 bg-transparent"
                        >
                          <Link href={`/profile/documents/${doc.id}/supprimer`}>
                            <Trash2 className="w-4 h-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : (
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <FileText className="w-24 h-24 text-zinc-700 mb-6" />
                <CardTitle className="text-2xl text-white mb-2">Aucun document</CardTitle>
                <CardDescription className="mb-6">Ajoutez des documents importants pour vos enfants</CardDescription>
                <Button asChild className="bg-cyan-500 hover:bg-cyan-600 text-white border-0">
                  <Link href="/profile/documents/ajouter">
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter un document
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
