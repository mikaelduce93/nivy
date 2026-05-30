import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { TrustBanner } from "@/components/trust-banner"
import { Shield, Users, Camera, Phone, FileCheck, AlertCircle, CheckCircle2, Lock } from "lucide-react"

import { StickerCard } from "@/components/ui/sticker-card"
import { Niv } from "@/components/brand"
import { MeshBackground } from "@/components/ui/effects/mesh-background"

export const metadata = {
  title: "Sécurité | Nivy",
  description:
    "Notre engagement sécurité : encadrement professionnel, sans alcool, contrôles stricts pour des événements ados en toute sérénité",
}

const MEASURES = [
  {
    icon: Shield,
    bg: "bg-lime",
    title: "100% sans alcool",
    items: [
      "Contrôles à l'entrée et fouilles si nécessaire",
      "Surveillance continue pendant l'événement",
      "Boissons servies uniquement par notre staff",
      "Zéro tolérance — expulsion immédiate si infraction",
    ],
  },
  {
    icon: Users,
    bg: "bg-teal",
    title: "Encadrement professionnel",
    items: [
      "Ratio 1 adulte pour 10 adolescents maximum",
      "Staff formé aux premiers secours",
      "Équipe de sécurité professionnelle sur place",
      "Supervision continue de A à Z",
    ],
  },
  {
    icon: Camera,
    bg: "bg-gold",
    title: "Check-in / check-out sécurisé",
    items: [
      "Scan QR code à l'arrivée et au départ",
      "Notifications temps réel aux parents",
      "Photo de confirmation à l'entrée",
      "Aucune sortie non autorisée",
    ],
  },
  {
    icon: Phone,
    bg: "bg-pink",
    title: "Communication parents",
    items: [
      "Ligne directe disponible H24 pendant l'événement",
      "Updates réguliers par SMS/WhatsApp",
      "Réponse immédiate en cas d'urgence",
      "Rapport post-événement disponible",
    ],
  },
]

const OTHER = [
  {
    icon: Lock,
    title: "Contrôles d'accès",
    items: [
      "Vérification d'âge à l'entrée (CIN/Carte d'identité)",
      "Liste de participants pré-validée",
      "Bracelets d'identification obligatoires",
      "Sortie uniquement avec autorisation parentale",
    ],
  },
  {
    icon: AlertCircle,
    title: "Règles de conduite",
    items: [
      "Respect obligatoire entre participants",
      "Interdiction de fumer (y compris vape)",
      "Tenue vestimentaire appropriée requise",
      "Téléphones autorisés mais usage modéré",
    ],
  },
  {
    icon: Shield,
    title: "Sécurité physique",
    items: [
      "Lieux vérifiés et aux normes de sécurité",
      "Issues de secours clairement indiquées",
      "Extincteurs et matériel de premiers secours",
      "Éclairage optimal dans toutes les zones",
    ],
  },
  {
    icon: Users,
    title: "Protection des mineurs",
    items: [
      "Autorisation parentale obligatoire",
      "Aucun contact avec des adultes externes",
      "Protection des données personnelles (CNDP)",
      "Droit à l'image respecté (opt-out disponible)",
    ],
  },
]

export default function SecuritePage() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <TrustBanner />

      <main className="pb-16 pt-20">
        {/* Hero */}
        <div className="relative overflow-hidden">
          <MeshBackground />
          <div className="relative mx-auto mb-12 max-w-4xl px-4 pt-12 text-center sm:px-6 lg:px-8">
            <div className="flex flex-col items-center gap-5">
              <Niv mood="proud" size={104} float />
              <p className="eyebrow tracking-[0.16em]">Sécurité · ta tranquillité, notre priorité</p>
              <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-5xl">
                La sécurité <em className="font-semibold italic text-pink">avant tout</em>
              </h1>
              <p className="max-w-3xl text-xl leading-relaxed text-ink-2">
                Des événements pour ados conçus avec les plus hauts standards de sécurité.
                Encadrement professionnel, contrôles stricts, environnement surveillé.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Main Security Measures */}
          <div className="mb-12 grid gap-6 md:grid-cols-2">
            {MEASURES.map((m) => (
              <StickerCard key={m.title} variant="hover" className="gap-3 p-6">
                <span className={`grid size-12 place-items-center rounded-xl border-2 border-ink ${m.bg}`}>
                  <m.icon className="size-6 text-ink" aria-hidden="true" />
                </span>
                <h3 className="font-display text-xl font-extrabold text-ink">{m.title}</h3>
                <ul className="space-y-2 text-mute">
                  {m.items.map((it) => (
                    <li key={it} className="flex items-start gap-2">
                      <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-lime">
                        <CheckCircle2 className="size-3.5 text-ink" aria-hidden="true" />
                      </span>
                      <span>{it}</span>
                    </li>
                  ))}
                </ul>
              </StickerCard>
            ))}
          </div>

          {/* Additional Measures */}
          <StickerCard className="mb-12 gap-6 p-8">
            <h2 className="flex items-center gap-3 font-display text-2xl font-extrabold text-ink">
              <FileCheck className="size-6 text-teal" aria-hidden="true" />
              Autres mesures de sécurité
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              {OTHER.map((o) => (
                <div key={o.title}>
                  <h3 className="mb-3 flex items-center gap-2 font-display font-bold text-ink">
                    <o.icon className="size-5 text-teal" aria-hidden="true" />
                    {o.title}
                  </h3>
                  <ul className="space-y-2 text-sm text-mute">
                    {o.items.map((it) => (
                      <li key={it}>• {it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </StickerCard>

          {/* Emergency Protocol */}
          <StickerCard className="border-destructive p-8" style={{ background: "var(--danger-soft)" }}>
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-ink bg-white">
                <AlertCircle className="size-6 text-destructive" aria-hidden="true" />
              </span>
              <div>
                <h2 className="mb-4 font-display text-2xl font-extrabold text-ink">Protocole d'urgence</h2>
                <p className="mb-4 text-ink-2">
                  En cas d'incident ou d'urgence médicale, notre équipe suit un protocole strict :
                </p>
                <ol className="list-inside list-decimal space-y-2 text-ink-2">
                  <li>Contact immédiat des parents et services d'urgence si nécessaire</li>
                  <li>Premiers secours prodigués par notre staff formé</li>
                  <li>Évacuation ordonnée si la situation l'exige</li>
                  <li>Rapport détaillé fourni aux parents</li>
                </ol>
                <div className="mt-6 rounded-xl border-2 border-ink bg-white p-4">
                  <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-destructive">
                    Numéro d'urgence événement
                  </p>
                  <p className="mt-1 font-display text-2xl font-extrabold tabular-nums text-ink">
                    +212 661 234 567
                  </p>
                  <p className="mt-1 font-mono text-xs text-mute">
                    Disponible uniquement pendant les événements
                  </p>
                </div>
              </div>
            </div>
          </StickerCard>
        </div>
      </main>

      <Footer />
    </div>
  )
}
