import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Button } from "@/components/ui/button"
import { Niv, NivCoach } from "@/components/brand"
import { CheckRound } from "@/components/ui/check-round"
import {
  ArrowLeft,
  ShieldCheck,
  Clock,
  AlertTriangle,
  Pen,
  FileSignature,
} from "lucide-react"
import Link from "next/link"
import { EmptyState } from "@/components/ui/states/empty-state"

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
    <div className="min-h-screen bg-background text-ink">
      <div className="container mx-auto px-6 pt-10 pb-20 sm:pt-16 max-w-4xl">
        <Button asChild variant="ghost" className="mb-6 text-mute hover:text-ink">
          <Link href="/parent">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour au dashboard
          </Link>
        </Button>

        <div className="mb-8 flex items-center gap-4">
          <Niv size={72} mood="calm" />
          <div>
            <p className="eyebrow">Compte · Documents</p>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-ink">
              Tes <em className="font-semibold italic text-pink">papiers</em> Nivy
            </h1>
            <p className="text-mute mt-1">
              Tes signatures électroniques et consentements Nivy (loi 09-08 / CNDP)
            </p>
          </div>
        </div>

        {/* Status banner */}
        {hasSigned ? (
          <StickerCard className="mb-6 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <CheckRound checked aria-label="Autorisation active" className="pointer-events-none mt-0.5" />
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Autorisation parentale active</p>
                  <p className="text-sm text-mute mt-1">
                    Ta signature électronique est enregistrée. Tu peux approuver
                    les demandes de tes teens et recharger des coins en toute confiance.
                  </p>
                </div>
              </div>
              <Button asChild variant="outline" className="shrink-0">
                <Link href="/parent/e-signature">
                  <Pen className="h-4 w-4 mr-2" />
                  Renouveler
                </Link>
              </Button>
            </div>
          </StickerCard>
        ) : (
          <StickerCard className="mb-6 p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="h-11 w-11 shrink-0 rounded-full border-2 border-ink bg-gold flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-ink" />
                </div>
                <div>
                  <p className="font-display text-lg font-extrabold text-ink">Autorisation requise</p>
                  <p className="text-sm text-mute mt-1">
                    Avant d'approuver une demande ou de recharger des coins, tu dois
                    signer électroniquement l'autorisation parentale.
                  </p>
                </div>
              </div>
              <Button asChild variant="pink" className="shrink-0">
                <Link href="/parent/e-signature">
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Signer maintenant
                </Link>
              </Button>
            </div>
          </StickerCard>
        )}

        {/* Signed documents list */}
        <StickerCard className="p-6">
          <h2 className="font-display text-xl font-extrabold text-ink flex items-center gap-2 mb-4">
            <FileSignature className="h-5 w-5 text-lime" />
            Mes signatures
          </h2>
          {signatures.length === 0 ? (
            <EmptyState
              size="small"
              nivMood="calm"
              title="Aucun document signé"
              description="Aucun document signé pour le moment."
            />
          ) : (
            <div className="space-y-3">
              {signatures.map((sig: any) => (
                <StickerCard
                  key={sig.id}
                  variant="panel"
                  className="p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-xl border-2 border-ink bg-paper flex items-center justify-center">
                        <FileSignature className="w-5 h-5 text-lime" />
                      </div>
                      <div>
                        <p className="font-bold text-ink">Autorisation parentale</p>
                        <p className="font-mono text-xs text-mute flex flex-wrap items-center gap-2 mt-1">
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
                    <span
                      className={
                        sig.terms_accepted
                          ? "shrink-0 rounded-md border-2 border-ink bg-lime px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-ink"
                          : "shrink-0 rounded-md border-2 border-line bg-paper px-2.5 py-1 font-mono text-[11px] font-extrabold uppercase tracking-[0.1em] text-mute"
                      }
                    >
                      {sig.terms_accepted ? "Acceptée" : "Brouillon"}
                    </span>
                  </div>
                </StickerCard>
              ))}
            </div>
          )}
        </StickerCard>

        {/* Compliance footer */}
        <NivCoach
          mood="calm"
          className="mt-6"
          message="Tes documents sont conservés conformément à la loi 09-08 (CNDP) et au RGPD. L'accès se fait via des URLs signées 5 minutes sur un bucket privé — promis, c'est bien gardé."
        />
      </div>
    </div>
  )
}
