/**
 * /teen/partners/[id] — Boutique partenaire (V6, #232).
 *
 * Vraie boutique par partenaire : l'ado entre chez un partenaire, parcourt ses
 * offres et les achète avec ses coins. Le composant serveur charge le partenaire
 * (actif), ses offres achetables (approuvées + actives) et les bons déjà obtenus
 * par l'ado. Le composant client gère l'achat (POST /api/teen/partners/buy →
 * RPC purchase_partner_offer) et l'affichage honnête du code de bon / des erreurs.
 *
 * Sections : Offres (achat coins), Infos (détails partenaire). Le Menu / la
 * réservation de lieu sont gérés par d'autres piliers (food / bookings) — un
 * encart le signale sans le dupliquer ici.
 *
 * Scope d'écriture : ce fichier + ./shop-client. Aucune écriture DB ici (lecture
 * seule) ; aucune migration.
 */

import { getUserRole } from "@/lib/auth/get-user-role"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Phone, Globe, Clock, Store } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { StickerCard } from "@/components/ui/sticker-card"
import { Badge } from "@/components/ui/badge"
import { Niv } from "@/components/brand"
import { PartnerShopClient, type ShopOffer, type ShopVoucher } from "./shop-client"

export const dynamic = "force-dynamic"

const TYPE_LABEL: Record<string, string> = {
  retail: "Boutique",
  venue: "Lieu",
  club: "Club",
  education: "École",
  food: "Resto",
  event_talent: "DJ",
  event_organizer: "Événement",
}

interface PartnerDetail {
  id: string
  company_name: string | null
  partner_type: string | null
  sub_category: string | null
  status: string | null
  phone: string | null
  website: string | null
  description: string | null
  business_hours: unknown
}

interface OfferRow {
  id: string
  title: string | null
  description: string | null
  offer_type: string | null
  discount_pct: number | null
  price_coins: number | null
  price_dh: number | null
  valid_until: string | null
  requires_vip: boolean | null
  min_vip_level: string | null
  max_total_uses: number | null
  current_total_uses: number | null
}

interface VoucherRow {
  id: string
  offer_id: string
  code: string | null
  status: string | null
  created_at: string | null
}

function formatBusinessHours(raw: unknown): string | null {
  if (!raw || typeof raw !== "object") return null
  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) return null
  return entries
    .map(([day, val]) => `${day} : ${typeof val === "string" ? val : JSON.stringify(val)}`)
    .join(" · ")
}

export default async function TeenPartnerShopPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const userInfo = await getUserRole()
  if (!userInfo) redirect("/auth/login")
  if (userInfo.role !== "teen") redirect("/auth/redirect")

  const { id } = await params
  const supabase = await createClient()

  const { data: partnerData, error: partnerErr } = await supabase
    .from("partners")
    .select(
      "id, company_name, partner_type, sub_category, status, phone, website, description, business_hours",
    )
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle()

  if (partnerErr || !partnerData) notFound()
  const partner = partnerData as PartnerDetail

  const { data: offersData } = await supabase
    .from("partner_offers")
    .select(
      "id, title, description, offer_type, discount_pct, price_coins, price_dh, valid_until, requires_vip, min_vip_level, max_total_uses, current_total_uses",
    )
    .eq("partner_id", id)
    .eq("is_active", true)
    .eq("status", "approved")
    .order("created_at", { ascending: false })

  // "Achetable" = price_coins > 0. Les autres offres (réductions sur place, etc.)
  // relèvent de /teen/offres et ne s'achètent pas ici.
  const purchasableOffers: ShopOffer[] = ((offersData as OfferRow[]) ?? [])
    .filter((o) => (o.price_coins ?? 0) > 0)
    .map((o) => ({
      id: o.id,
      title: o.title ?? "Offre",
      description: o.description,
      offerType: o.offer_type,
      discountPct: o.discount_pct ?? null,
      priceCoins: o.price_coins ?? 0,
      priceDh: o.price_dh ?? null,
      validUntil: o.valid_until,
      requiresVip: !!o.requires_vip,
      minVipLevel: o.min_vip_level,
      soldOut:
        o.max_total_uses != null &&
        (o.current_total_uses ?? 0) >= o.max_total_uses,
    }))

  const { data: voucherData } = await supabase
    .from("partner_offer_redemptions")
    .select("id, offer_id, code, status, created_at")
    .eq("teen_id", userInfo.profileId)
    .eq("partner_id", id)
    .order("created_at", { ascending: false })

  const vouchers: ShopVoucher[] = ((voucherData as VoucherRow[]) ?? []).map((v) => ({
    id: v.id,
    offerId: v.offer_id,
    code: v.code,
    status: v.status,
    createdAt: v.created_at,
  }))

  const balance = userInfo.teenData?.coins ?? 0
  const typeLabel =
    (partner.partner_type && TYPE_LABEL[partner.partner_type]) ||
    partner.partner_type ||
    null
  const hours = formatBusinessHours(partner.business_hours)

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      {/* Retour */}
      <Link
        href="/teen/partenaires"
        className="mb-4 inline-flex items-center gap-1.5 font-mono text-xs font-bold text-mute transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Toutes les boutiques
      </Link>

      {/* En-tête boutique */}
      <header className="mb-6 flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-accent-soft">
          <Store className="h-6 w-6 text-ink" aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="eyebrow tracking-[0.16em]">Boutique partenaire</p>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
            {partner.company_name ?? "Partenaire"}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {typeLabel && <Badge variant="outline">{typeLabel}</Badge>}
            {partner.sub_category && (
              <Badge variant="outline">{partner.sub_category}</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Offres achetables avec coins (client = interaction d'achat) */}
      <PartnerShopClient
        offers={purchasableOffers}
        vouchers={vouchers}
        balance={balance}
      />

      {/* Encart Menu / Réservation — géré par d'autres piliers */}
      {(partner.partner_type === "food" ||
        partner.sub_category === "restaurant" ||
        partner.partner_type === "venue") && (
        <StickerCard variant="panel" className="mt-6 gap-2 p-5">
          <h2 className="font-display text-lg font-bold text-ink">Menu &amp; réservation</h2>
          <p className="text-sm text-mute">
            Le menu et la réservation de ce lieu sont gérés ailleurs dans l&apos;app
            (commande &amp; sorties). Cette boutique sert à acheter les offres
            ci-dessus avec tes coins.
          </p>
        </StickerCard>
      )}

      {/* Infos partenaire */}
      <section aria-label="Informations du partenaire" className="mt-6">
        <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight text-ink">
          Infos
        </h2>
        <StickerCard className="gap-4 p-5">
          {partner.description ? (
            <p className="text-sm text-ink-2">{partner.description}</p>
          ) : (
            <p className="text-sm text-mute">Ce partenaire n&apos;a pas encore de description.</p>
          )}
          <ul className="space-y-2 text-sm text-ink">
            {partner.phone && (
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                <a href={`tel:${partner.phone}`} className="hover:underline">
                  {partner.phone}
                </a>
              </li>
            )}
            {partner.website && (
              <li className="flex items-center gap-2">
                <Globe className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                <a
                  href={partner.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate hover:underline"
                >
                  {partner.website}
                </a>
              </li>
            )}
            {hours && (
              <li className="flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 text-mute" aria-hidden />
                <span className="text-mute">{hours}</span>
              </li>
            )}
            {!partner.phone && !partner.website && !hours && (
              <li className="flex items-center gap-2 text-mute">
                <MapPin className="h-4 w-4 shrink-0" aria-hidden />
                Coordonnées bientôt disponibles.
              </li>
            )}
          </ul>
        </StickerCard>
      </section>

      <div className="mt-8 flex items-center justify-center">
        <Niv mood="happy" size={48} aria-hidden />
      </div>
    </div>
  )
}
