import type { Metadata } from "next"
import Link from "next/link"
import { StickerCard } from "@/components/ui/sticker-card"
import {
  Calendar,
  Car,
  UtensilsCrossed,
  Cake,
  Compass,
  Users,
  Briefcase,
  GraduationCap,
  Tag,
  ArrowRight,
  MapPin,
  Store,
  ShoppingBag,
} from "lucide-react"

export const metadata: Metadata = { title: "Services" }

// #204 — Hub Services : pilier de nav qui dé-orphélinise les features réelles
// de la « vie réelle » (events, transport, food, anniv, orientation, école,
// offres). Chaque carte pointe vers un écran existant et fonctionnel.
// Le bien-être (`/teen/wellbeing`, « à venir ») est volontairement masqué tant
// qu'il n'a pas de contenu réel.
type Service = {
  href: string
  label: string
  description: string
  icon: React.ElementType
  tint: string
}

const SERVICES: Service[] = [
  {
    href: "/teen/events",
    label: "Sorties & événements",
    description: "Découvre et réserve les sorties près de chez toi.",
    icon: Calendar,
    tint: "bg-pink/15",
  },
  {
    href: "/teen/rides",
    label: "Transport",
    description: "Commande un trajet validé par tes parents.",
    icon: Car,
    tint: "bg-teal/15",
  },
  {
    href: "/teen/food",
    label: "Nourriture",
    description: "Commande chez nos restos partenaires.",
    icon: UtensilsCrossed,
    tint: "bg-gold/15",
  },
  {
    href: "/teen/birthday",
    label: "Anniversaire",
    description: "Organise ton anniv : lieu, pack et invités.",
    icon: Cake,
    tint: "bg-pink/15",
  },
  {
    href: "/teen/pathways",
    label: "Orientation",
    description: "Explore les filières et projette-toi.",
    icon: Compass,
    tint: "bg-lime/15",
  },
  {
    href: "/teen/mentors",
    label: "Mentors",
    description: "Échange avec des mentors inspirants.",
    icon: Users,
    tint: "bg-teal/15",
  },
  {
    href: "/teen/internships",
    label: "Stages",
    description: "Trouve un stage pour découvrir un métier.",
    icon: Briefcase,
    tint: "bg-gold/15",
  },
  {
    href: "/teen/aide-scolaire",
    label: "Aide scolaire",
    description: "Tuteurs, notes et soutien dans tes matières.",
    icon: GraduationCap,
    tint: "bg-lime/15",
  },
  {
    href: "/teen/offres",
    label: "Offres & partenaires",
    description: "Profite des réductions de nos partenaires.",
    icon: Tag,
    tint: "bg-pink/15",
  },
  // V6 — le collectif : organiser, payer ensemble, débloquer par taille.
  {
    href: "/teen/rides/groups",
    label: "Sorties groupées",
    description: "Organise une sortie, invite tes amis, payez chacun sa part.",
    icon: Users,
    tint: "bg-teal/15",
  },
  {
    href: "/teen/food/groups",
    label: "Resto en groupe",
    description: "Commandez ensemble, le coût se partage (et se remise).",
    icon: UtensilsCrossed,
    tint: "bg-gold/15",
  },
  {
    href: "/teen/venues",
    label: "Lieux à réserver",
    description: "Réserve un créneau partenaire, à plusieurs.",
    icon: MapPin,
    tint: "bg-pink/15",
  },
  {
    href: "/teen/clubs",
    label: "Clubs",
    description: "Crée un club, gère cotisations et sessions.",
    icon: Users,
    tint: "bg-lime/15",
  },
  {
    href: "/teen/partenaires",
    label: "Boutiques partenaires",
    description: "Parcours et achète chez nos partenaires avec tes coins.",
    icon: Store,
    tint: "bg-teal/15",
  },
  {
    href: "/teen/marketplace",
    label: "Marketplace",
    description: "Les bons plans des vendeurs partenaires.",
    icon: ShoppingBag,
    tint: "bg-gold/15",
  },
]

export default function TeenServicesPage() {
  return (
    <div className="space-y-8 pt-6">
      <header className="space-y-2">
        <p className="eyebrow tracking-[0.16em]">Services</p>
        <h1 className="font-display text-4xl font-extrabold tracking-tight">
          Tes <em className="font-semibold italic text-pink">services</em>
        </h1>
        <p className="text-mute max-w-md">
          Sorties, transport, nourriture, orientation, école — tout au même endroit.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-2xl focus-visible:outline-none"
          >
            <StickerCard variant="hover" className="h-full p-5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink ${s.tint}`}
                >
                  <s.icon className="h-5 w-5 text-ink" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-display font-bold text-ink">{s.label}</h3>
                  <p className="text-sm text-mute">{s.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-mute" aria-hidden />
              </div>
            </StickerCard>
          </Link>
        ))}
      </div>
    </div>
  )
}
