import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Pen,
  FileSignature,
} from "lucide-react"
import Link from "next/link"

// Server-rendered parent document vault.
// Whitepaper §10/§22: signed authorizations live in `e_signatures` (PRIVATE bucket).
// Mock data has been removed — this page now reads the real signature record
// and surfaces the signing CTA when none is on file. The legacy mock dialog
// (signature pad, agreement checkboxes) is replaced by the canonical
// /parent/e-signature flow which writes to the e_signatures table.

async function getSignatures(parentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("e_signatures")
    .select("id, parent_full_name, terms_accepted, created_at")
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[parent/documents] e_signatures unavailable:", error.message)
    return []
  }
  return data ?? []
}

export default async function ParentDocumentsPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "parent") {
    redirect("/auth/redirect")
  }

  const signatures = await getSignatures(userInfo.profileId)
  const hasSigned = signatures.some((s: any) => s.terms_accepted)

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="container mx-auto px-6 py-32 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 text-zinc-400 hover:text-white">
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-emerald-400" />
            Documents & autorisations
          </h1>
          <p className="text-zinc-400 mt-1">
            Vos signatures électroniques et consentements Nivy (loi 09-08 / CNDP)
          </p>
        </div>

        {/* Status banner */}
        {hasSigned ? (
          <Card className="mb-6 bg-emerald-500/10 border-emerald-500/30">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Autorisation parentale active</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Votre signature électronique est enregistrée. Vous pouvez approuver
                    les demandes de vos teens et recharger des coins.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="border-zinc-700 text-zinc-200">
                <Link href="/parent/e-signature">
                  <Pen className="h-4 w-4 mr-2" />
                  Renouveler
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="mb-6 bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-bold text-white">Autorisation requise</p>
                  <p className="text-sm text-zinc-400 mt-1">
                    Avant d'approuver une demande ou de recharger des coins, vous devez
                    signer électroniquement l'autorisation parentale.
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-600 hover:to-emerald-600 text-zinc-950 font-bold shrink-0"
              >
                <Link href="/parent/e-signature">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Signer maintenant
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Signed documents list */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <FileSignature className="h-5 w-5 text-emerald-400" />
              Mes signatures
            </CardTitle>
          </CardHeader>
          <CardContent>
            {signatures.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
                <p className="text-zinc-400">Aucun document signé pour le moment.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {signatures.map((sig: any) => (
                  <div
                    key={sig.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/40 border border-zinc-800"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                        <FileSignature className="w-5 h-5 text-emerald-400" />
                      </div>
                      <div>
                        <p className="font-bold text-white">Autorisation parentale</p>
                        <p className="text-xs text-zinc-500 flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3" />
                          Signée le{" "}
                          {new Date(sig.created_at).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                          {sig.parent_full_name && (
                            <>
                              <span>•</span>
                              <span>{sig.parent_full_name}</span>
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        sig.terms_accepted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-zinc-500/20 text-zinc-400"
                      }
                    >
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {sig.terms_accepted ? "Acceptée" : "Brouillon"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance footer */}
        <p className="text-xs text-zinc-500 mt-6 text-center">
          Documents conservés conformément à la loi 09-08 (CNDP) et au RGPD.
          Accès via URLs signées 5 minutes — bucket privé.
        </p>
      </div>
    </div>
  )
}
