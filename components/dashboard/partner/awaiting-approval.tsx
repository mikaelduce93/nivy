import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Clock,
  Shield,
  XCircle,
  CheckCircle2,
  ArrowRight,
  FileText,
  Mail,
  AlertTriangle,
} from "lucide-react"

interface PartnerAwaitingApprovalProps {
  /** Display name of the company. */
  companyName: string
  /** Raw status from `partners.status` — anything other than "active" / "verified" is treated as not-yet-approved. */
  status: string
  /** ISO timestamp of when the partner submitted their application. */
  submittedAt?: string | null
}

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente de validation",
  in_review: "En cours de revue",
  rejected: "Demande refusée",
  suspended: "Compte suspendu",
}

export function PartnerAwaitingApproval({
  companyName,
  status,
  submittedAt,
}: PartnerAwaitingApprovalProps) {
  const isRejected = status === "rejected"
  const isSuspended = status === "suspended"
  const headline = STATUS_LABEL[status] ?? "En attente de validation"

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        {/* Hero */}
        <Card
          className={`mb-6 border ${
            isRejected
              ? "bg-red-500/10 border-red-500/30"
              : "bg-amber-500/10 border-amber-500/30"
          }`}
        >
          <CardContent className="p-8">
            <div className="flex items-start gap-4">
              <div
                className={`h-14 w-14 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                  isRejected ? "bg-red-500/20" : "bg-amber-500/20"
                }`}
              >
                {isRejected ? (
                  <XCircle className="h-7 w-7 text-red-400" />
                ) : isSuspended ? (
                  <AlertTriangle className="h-7 w-7 text-amber-400" />
                ) : (
                  <Clock className="h-7 w-7 text-amber-400" />
                )}
              </div>
              <div className="flex-1">
                <p
                  className={`text-xs font-black uppercase tracking-widest mb-1 ${
                    isRejected ? "text-red-400" : "text-amber-400"
                  }`}
                >
                  {headline}
                </p>
                <h1 className="text-3xl font-black text-white tracking-tight">
                  {companyName}
                </h1>
                {submittedLabel && !isRejected && (
                  <p className="text-sm text-zinc-400 mt-2">
                    Demande soumise le {submittedLabel}
                  </p>
                )}
                {isRejected ? (
                  <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                    Votre demande de partenariat n&apos;a pas été approuvée.
                    Notre équipe vous a contacté(e) par email avec les
                    raisons du refus et les éventuelles étapes pour
                    soumettre à nouveau.
                  </p>
                ) : isSuspended ? (
                  <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                    Votre compte partenaire a été temporairement suspendu.
                    Contactez le support pour rétablir votre accès.
                  </p>
                ) : (
                  <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                    Notre équipe est en train d&apos;examiner votre dossier.
                    Vous recevrez un email dès que votre compte sera activé,
                    sous 24 à 48h ouvrées. En attendant, vous pouvez
                    compléter votre dossier KYC pour accélérer la validation.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* What happens next */}
        {!isRejected && !isSuspended && (
          <Card className="bg-zinc-900 border-zinc-800 mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" />
                Prochaines étapes
              </h2>
              <ol className="space-y-3">
                {[
                  {
                    icon: FileText,
                    title: "Compléter le KYC",
                    desc: "Téléverser CIN du gérant, RIB et autres documents légaux.",
                    done: false,
                  },
                  {
                    icon: Shield,
                    title: "Vérification par notre équipe",
                    desc: "Validation de l'identité et des documents (24-48h).",
                    done: false,
                  },
                  {
                    icon: CheckCircle2,
                    title: "Activation du compte",
                    desc: "Création de votre première offre et accès au scanner.",
                    done: false,
                  },
                ].map((step, idx) => {
                  const Icon = step.icon
                  return (
                    <li key={idx} className="flex items-start gap-3">
                      <div className="h-9 w-9 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                        <Icon className="h-4 w-4 text-cyan-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{step.title}</p>
                        <p className="text-sm text-zinc-400">{step.desc}</p>
                      </div>
                    </li>
                  )
                })}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-3">
          {!isRejected && !isSuspended && (
            <Button
              asChild
              className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
            >
              <Link href="/partner/kyc">
                <FileText className="h-4 w-4 mr-2" />
                Compléter mon KYC
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          )}
          <Button
            asChild
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            <Link href="/partner/support">
              <Mail className="h-4 w-4 mr-2" />
              Contacter le support
            </Link>
          </Button>
        </div>

        <p className="text-xs text-zinc-500 text-center mt-6">
          Une question ? Écrivez-nous à{" "}
          <a
            href="mailto:partenaires@nivy.ma"
            className="text-cyan-400 hover:underline"
          >
            partenaires@nivy.ma
          </a>
        </p>
      </div>
    </div>
  )
}
