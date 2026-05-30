/**
 * Wave V1.2-F — Partner KYC documents.
 * Wave 3A.5: in-page uploader wired to POST /api/partner/kyc/upload (canon §4.6).
 *
 * RSC. Reads `kyc_documents` for the authenticated partner via the service-role
 * client. Signed READ URLs (15 min) are generated server-side from the private
 * `kyc-documents` bucket. New uploads go through the canonical signed-token
 * pattern — we never get-public-url on KYC media (canon §6 F12).
 */
import { Button } from "@/components/ui/button"
import { StickerCard } from "@/components/ui/sticker-card"
import { SegmentedProgress } from "@/components/ui/progress"
import { NivCoach, NivEmpty } from "@/components/brand"
import { FileText, ExternalLink, AlertTriangle } from "lucide-react"
import { redirect } from "next/navigation"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { PartnerKycUploader } from "@/components/partners/PartnerKycUploader"

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

const PILL_BASE =
  "inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] text-ink"

function statusPill(status: string) {
  switch (status) {
    case "approved":
    case "verified":
      return (
        <span className={`${PILL_BASE} bg-lime`}>
          <span aria-hidden="true" className="grid size-4 place-items-center rounded-full bg-ink text-[10px] font-bold text-lime">
            ✓
          </span>
          Vérifié
        </span>
      )
    case "pending":
    case "submitted":
    case "in_review":
      return <span className={`${PILL_BASE} bg-gold`}>En cours</span>
    case "rejected":
      return <span className={`${PILL_BASE} bg-coral`}>Refusé</span>
    default:
      return <span className={`${PILL_BASE} bg-paper-2`}>{status}</span>
  }
}

export default async function PartnerKYCPage() {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")

  if (userInfo.role !== "partner") {
    return (
      <div className="max-w-3xl space-y-6 pt-6">
        <header className="space-y-2">
          <p className="eyebrow">Vérification</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ton <em className="font-semibold italic text-pink">dossier</em>
          </h1>
        </header>
        <NivEmpty
          mood="calm"
          title="Accès refusé"
          description="Cet espace est réservé aux partenaires."
        />
      </div>
    )
  }

  const partnerId = userInfo.partnerData?.id
  if (!partnerId) {
    return (
      <div className="max-w-3xl space-y-6 pt-6">
        <header className="space-y-2">
          <p className="eyebrow">Vérification</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ton <em className="font-semibold italic text-pink">dossier</em>
          </h1>
        </header>
        <NivEmpty
          mood="calm"
          title="Profil partenaire introuvable"
          description="Ton compte n'est pas encore lié à une fiche partenaire active."
        />
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
    <div className="max-w-3xl space-y-6 pt-6">
      {/* Header */}
      <header className="space-y-2">
        <p className="eyebrow">Vérification</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Ton <em className="font-semibold italic text-pink">dossier</em>
        </h1>
        <p className="text-mute">
          {userInfo.partnerData?.companyName || "Partenaire"} · on vérifie tes pièces avant
          d&apos;activer ton compte.
        </p>
      </header>

      {/* Coach rassurant — moment anxiogène (charte F4). */}
      <NivCoach
        mood="calm"
        message="On vérifie tes papiers, ça prend 24 à 48h. Reste cool : tu peux suivre l'avancement ici."
      />

      {/* Avancement du dossier — jauge segmentée plutôt qu'un mur de compteurs. */}
      {totals.total > 0 && (
        <StickerCard className="gap-3 p-6">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
              Avancement du dossier
            </span>
            <span className="font-display text-lg font-extrabold tabular-nums text-ink">
              {totals.approved}/{totals.total} vérifié{totals.approved > 1 ? "s" : ""}
            </span>
          </div>
          <SegmentedProgress steps={totals.total} current={totals.approved} />
          {totals.pending > 0 && (
            <p className="text-xs text-mute">
              {totals.pending} pièce{totals.pending > 1 ? "s" : ""} en cours de revue.
            </p>
          )}
        </StickerCard>
      )}

      {/* Rejection alert — re-upload direct via l'uploader ci-dessous. */}
      {rejected.length > 0 && (
        <StickerCard className="gap-2 border-coral p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-coral" />
            <div className="text-sm">
              <p className="font-display font-bold text-ink">
                {rejected.length} document{rejected.length > 1 ? "s" : ""} refusé
                {rejected.length > 1 ? "s" : ""}
              </p>
              <p className="mt-1 text-mute">
                Renvoie une nouvelle pièce directement depuis l&apos;encart ci-dessous. Les motifs
                de refus sont indiqués sur chaque document.
              </p>
            </div>
          </div>
        </StickerCard>
      )}

      {/* Wave 3A.5 — in-page uploader (private bucket, canon §4.6). */}
      <PartnerKycUploader />

      {/* Document list */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-extrabold">Pièces du dossier</h2>
        {signed.length === 0 ? (
          <NivEmpty
            mood="calm"
            title="Aucune pièce déposée"
            description="Balance tes papiers ici pour activer ton compte partenaire."
          />
        ) : (
          <div className="space-y-3">
            {signed.map((d) => (
              <StickerCard key={d.id} className="gap-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-paper-2">
                      <FileText className="h-4 w-4 text-ink" />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display font-bold capitalize text-ink">{docLabel(d.doc_type)}</p>
                      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-mute">
                        Déposé le{" "}
                        {new Date(d.created_at).toLocaleDateString("fr-FR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                        {d.subject_kind ? ` · ${d.subject_kind}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {statusPill(d.status)}
                    {d.signedUrl ? (
                      <Button asChild variant="outline" size="sm">
                        <a href={d.signedUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="mr-1 h-3 w-3" />
                          Voir
                        </a>
                      </Button>
                    ) : (
                      <span className="text-xs text-mute">Lien indisponible</span>
                    )}
                  </div>
                </div>
                {d.status === "rejected" && d.rejection_reason && (
                  <p className="rounded-xl border-2 border-coral bg-coral/10 px-3 py-2 text-sm text-coral">
                    Motif du refus : {d.rejection_reason}
                  </p>
                )}
              </StickerCard>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-mute">
        Les liens d&apos;aperçu sont signés 15 minutes. Pour mettre à jour une pièce, dépose-la
        depuis l&apos;encart ci-dessus.
      </p>
    </div>
  )
}
