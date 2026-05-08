/**
 * Wave V1.2-F — Partner KYC documents (read-only).
 *
 * RSC. Reads `kyc_documents` for the authenticated partner via the service-role
 * client (RLS on this table requires a `partner_staff` row with role='owner';
 * we mirror the admin C.7 pattern instead since partners are matched by email
 * via `getUserRole`). Signed URLs (15 min) are generated server-side from the
 * private `kyc-documents` bucket. No client-side upload is wired here — the
 * onboarding upload flow lives elsewhere; this page exposes the dossier state
 * to the partner so they can see what's pending / rejected and contact support.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Shield,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  AlertTriangle,
} from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { EmptyState } from "@/components/ui/states/empty-state"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const SIGNED_URL_TTL_SECONDS = 60 * 15 // 15 min — matches admin C.7

const DOC_TYPE_LABEL: Record<string, string> = {
  rc: "Registre du commerce",
  ice: "ICE",
  patente: "Patente",
  cin: "Carte d'identité (représentant)",
  rib: "RIB",
  statuts: "Statuts de la société",
  pouvoir: "Pouvoir de signature",
  passport: "Passeport",
  attestation: "Attestation",
}

function docLabel(docType: string): string {
  return DOC_TYPE_LABEL[docType] || docType.replace(/_/g, " ")
}

function statusBadge(status: string) {
  switch (status) {
    case "approved":
    case "verified":
      return (
        <Badge className="bg-green-500/20 text-green-400">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Vérifié
        </Badge>
      )
    case "pending":
    case "submitted":
    case "in_review":
      return (
        <Badge className="bg-yellow-500/20 text-yellow-400">
          <Clock className="w-3 h-3 mr-1" />
          En cours
        </Badge>
      )
    case "rejected":
      return (
        <Badge className="bg-red-500/20 text-red-400">
          <XCircle className="w-3 h-3 mr-1" />
          Refusé
        </Badge>
      )
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

export default async function PartnerKYCPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Vérification KYC</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center text-red-400">
            Accès refusé — espace réservé aux partenaires.
          </CardContent>
        </Card>
      </div>
    )
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-black text-white">Vérification KYC</h1>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-10 text-center">
            <p className="text-zinc-300 font-semibold">Profil partenaire introuvable</p>
            <p className="text-sm text-zinc-500 mt-2">
              Votre compte n'est pas encore lié à une fiche partenaire active.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const sr = createServiceRoleClient()

  const { data: docsRaw } = await sr
    .from("kyc_documents")
    .select("id, doc_type, file_path, status, rejection_reason, subject_kind, created_at, reviewed_at")
    .eq("partner_id", partnerId)
    .order("created_at", { ascending: true })

  const docs = (docsRaw ?? []) as Array<{
    id: string
    doc_type: string
    file_path: string
    status: string
    rejection_reason: string | null
    subject_kind: string | null
    created_at: string
    reviewed_at: string | null
  }>

  // Sign every doc once (15 min). Server-side only.
  const signed = await Promise.all(
    docs.map(async (d) => {
      const { data } = await sr.storage
        .from("kyc-documents")
        .createSignedUrl(d.file_path, SIGNED_URL_TTL_SECONDS)
      return { ...d, signedUrl: data?.signedUrl ?? null }
    }),
  )

  const totals = {
    total: signed.length,
    approved: signed.filter((d) => d.status === "approved" || d.status === "verified").length,
    pending: signed.filter((d) =>
      ["pending", "submitted", "in_review"].includes(d.status),
    ).length,
    rejected: signed.filter((d) => d.status === "rejected").length,
  }

  const rejected = signed.filter((d) => d.status === "rejected")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-blue-400" />
            Vérification KYC
          </h1>
          <p className="text-zinc-400 mt-1">
            État de votre dossier ·{" "}
            <span className="text-white">{userInfo.partnerData?.companyName || "Partenaire"}</span>
          </p>
        </div>
      </div>

      {/* Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-zinc-400">Documents</p>
            <p className="text-2xl font-black text-white">{totals.total}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-green-400 font-medium">Vérifiés</p>
            <p className="text-2xl font-black text-white">{totals.approved}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-yellow-400 font-medium">En cours</p>
            <p className="text-2xl font-black text-white">{totals.pending}</p>
          </CardContent>
        </Card>
        <Card className="bg-zinc-900 border-zinc-800">
          <CardContent className="p-5">
            <p className="text-xs text-red-400 font-medium">Refusés</p>
            <p className="text-2xl font-black text-white">{totals.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Rejection alerts */}
      {rejected.length > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-400">
                  {rejected.length} document{rejected.length > 1 ? "s" : ""} refusé
                  {rejected.length > 1 ? "s" : ""}
                </p>
                <p className="text-zinc-400 mt-1">
                  Contactez le support pour soumettre un nouveau document. Les motifs de refus
                  sont indiqués ci-dessous.
                </p>
                <Button
                  asChild
                  variant="outline"
                  className="mt-3 border-red-500/40 text-red-300"
                >
                  <Link href="/partner/support">Contacter le support</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Pièces du dossier</CardTitle>
        </CardHeader>
        <CardContent>
          {signed.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucun document KYC"
              description="Aucune pièce justificative n'a encore été déposée pour votre fiche partenaire."
            />
          ) : (
            <div className="space-y-3">
              {signed.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-lg bg-zinc-800/50 border border-zinc-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-zinc-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="font-semibold text-white capitalize">
                        {docLabel(d.doc_type)}
                      </p>
                      <p className="text-xs text-zinc-500">
                        Déposé le{" "}
                        {new Date(d.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {d.subject_kind ? ` · ${d.subject_kind}` : ""}
                      </p>
                      {d.status === "rejected" && d.rejection_reason && (
                        <p className="text-xs text-red-400 mt-1">
                          Motif : {d.rejection_reason}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusBadge(d.status)}
                    {d.signedUrl ? (
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="border-zinc-700 text-zinc-300"
                      >
                        <a href={d.signedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-1" />
                          Voir
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-zinc-500">Lien indisponible</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-zinc-500">
        Les liens d'aperçu sont signés 15 minutes. Pour mettre à jour une pièce, contactez le
        support partenaires.
      </p>
    </div>
  )
}
