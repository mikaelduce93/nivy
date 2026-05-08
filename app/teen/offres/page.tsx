/**
 * Wave 3 — TICKET-028 [partner-defi] Teen-side partner-offer discovery surface.
 *
 * Surfaces ranked partner offers/challenges to the teen. Pipeline:
 *   1. Resolve teen via getUserRole().
 *   2. Call recommend_for_teen RPC (content_type='partner_offer'). The RPC
 *      already blends affinity_match (teen_interests + affinity_scores),
 *      novelty, context_fit, difficulty_fit, with a recently-seen penalty.
 *      Returns up to N rows ordered by score DESC.
 *   3. Hydrate rows via partner_offers (+ partners JOIN for business_name /
 *      city / address) so we can both render and link to the location.
 *   4. Capture an impression "view" signal per surfaced offer (best-effort,
 *      non-blocking) so the personalization engine sees the surface.
 *   5. Render via <DefiCard variant="physical"> with a server-action CTA
 *      that records a "click" behavioral_signal then redirects:
 *        - offer-flavored offer_type → external partner location URL.
 *        - challenge-flavored offer_type → internal scanner flow.
 *
 * Empty state: shown when the recommender returns no rows (e.g. zero active
 * partner offers, or no row matches RLS).
 *
 * Write-scope per ticket assignment: ONLY this file.
 *   - Does NOT touch partner_offers schema (PT4).
 *   - Does NOT touch /partner/offers (PT1 in Wave 2).
 *   - Reuses existing recommend_for_teen RPC + record_signal pipeline.
 */

import { redirect } from "next/navigation"
import Link from "next/link"
import { Sparkles, MapPin, RefreshCw } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { DefiCard, type DefiVariant } from "@/components/teen/defi-card"
import { recordSignal, recordSignalAsync } from "@/lib/analytics/signals"

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

type OfferType =
  | "discount"
  | "reduction"
  | "freebie"
  | "experience"
  | "challenge"
  | "voucher"
  | "bundle"
  | string
  | null

interface PartnerOfferRow {
  id: string
  partner_id: string
  title: string
  description: string | null
  offer_type: OfferType
  discount_pct: number | null
  price_coins: number | null
  price_dh: number | null
  valid_until: string | null
  tags: string[] | null
  partners?: {
    id: string
    business_name?: string | null
    company_name?: string | null
    city?: string | null
    address?: string | null
    website_url?: string | null
    booking_url?: string | null
  } | null
}

interface RecRow {
  id: string
  content_type: string
  score: number
  reason: string
}

interface HydratedOffer extends PartnerOfferRow {
  score: number
  reason: string
  isChallenge: boolean
  partnerLabel: string
  partnerCity: string | null
  externalUrl: string | null
  daysLeft: number | null
}

// ----------------------------------------------------------------------------
// Server data fetch
// ----------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function parseRecRows(data: unknown): RecRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row): RecRow | null => {
      if (typeof row === "string") {
        try {
          return JSON.parse(row) as RecRow
        } catch {
          return null
        }
      }
      if (row && typeof row === "object" && "id" in (row as Record<string, unknown>)) {
        return row as RecRow
      }
      return null
    })
    .filter((r): r is RecRow => !!r && typeof r.id === "string")
}

function isChallengeOfferType(offerType: OfferType): boolean {
  if (!offerType) return false
  const t = offerType.toLowerCase()
  return t === "challenge" || t === "experience" || t === "defi"
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null
  const ms = target - Date.now()
  if (ms < 0) return null
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function buildExternalUrl(
  partner: PartnerOfferRow["partners"],
  city: string | null,
): string | null {
  if (!partner) return null
  if (partner.booking_url) return partner.booking_url
  if (partner.website_url) return partner.website_url
  // Fallback: deep-link the in-app map filtered to this partner's city.
  if (city) return `/teen/map?city=${encodeURIComponent(city)}`
  return "/teen/map"
}

async function getRecommendedOffers(
  teenId: string,
): Promise<HydratedOffer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase.rpc("recommend_for_teen", {
    p_teen_id: teenId,
    p_content_type: "partner_offer",
    p_n: 12,
  })
  if (error) {
    console.error("[teen/offres] recommend_for_teen error:", error)
    return []
  }

  const rows = parseRecRows(data)
  if (rows.length === 0) return []

  const ids = rows.map((r) => r.id)

  const { data: offers, error: offersErr } = await supabase
    .from("partner_offers")
    .select(
      `
      id,
      partner_id,
      title,
      description,
      offer_type,
      discount_pct,
      price_coins,
      price_dh,
      valid_until,
      tags,
      partners:partner_id (
        id,
        business_name,
        company_name,
        city,
        address,
        website_url,
        booking_url
      )
    `,
    )
    .in("id", ids)
    .eq("is_active", true)

  if (offersErr) {
    console.error("[teen/offres] hydrate error:", offersErr)
    return []
  }

  const byId = new Map<string, PartnerOfferRow>()
  for (const o of (offers ?? []) as unknown as PartnerOfferRow[]) {
    byId.set(o.id, o)
  }

  return rows
    .map((r): HydratedOffer | null => {
      const offer = byId.get(r.id)
      if (!offer) return null
      const partner = offer.partners ?? null
      const partnerLabel =
        partner?.business_name ??
        partner?.company_name ??
        "Partenaire NIVY"
      const partnerCity = partner?.city ?? null
      const isChallenge = isChallengeOfferType(offer.offer_type)
      const externalUrl = isChallenge
        ? null
        : buildExternalUrl(partner, partnerCity)
      return {
        ...offer,
        score: r.score,
        reason: r.reason,
        isChallenge,
        partnerLabel,
        partnerCity,
        externalUrl,
        daysLeft: daysUntil(offer.valid_until),
      }
    })
    .filter((o): o is HydratedOffer => o !== null)
}

// ----------------------------------------------------------------------------
// Server action: log click signal then redirect.
// (Matches TICKET-028 acceptance: "click logs behavioral_signals.click".)
// ----------------------------------------------------------------------------

async function trackAndGo(formData: FormData): Promise<void> {
  "use server"

  const teenId = String(formData.get("teen_id") ?? "")
  const offerId = String(formData.get("offer_id") ?? "")
  const target = String(formData.get("target") ?? "")
  const surface = String(formData.get("surface") ?? "teen_offres")

  if (teenId && UUID_RE.test(teenId) && offerId && UUID_RE.test(offerId)) {
    await recordSignal({
      teenId,
      signalType: "click",
      targetType: "partner_offer",
      targetId: offerId,
      metadata: { surface, target },
    }).catch(() => {
      /* signals are best-effort */
    })
  }

  // Resolve the redirect destination. We constrain external URLs to http(s)
  // and internal targets to root-relative paths so a malformed `target`
  // can't be used to open weird schemes.
  let destination = "/teen"
  if (target.startsWith("/")) {
    destination = target
  } else if (target.startsWith("http://") || target.startsWith("https://")) {
    destination = target
  }
  redirect(destination)
}

// ----------------------------------------------------------------------------
// Card derivation helpers (presentation)
// ----------------------------------------------------------------------------

function variantFor(offer: HydratedOffer): DefiVariant {
  // Challenge-flavored offers fit the cyan "daily" energy; traditional
  // offers/discounts read better as "physical" emerald (existing brand
  // language for partner-redeemable défis). Both stay within the closed
  // DefiVariant set, no Tailwind drift.
  return offer.isChallenge ? "daily" : "physical"
}

function ctaLabelFor(offer: HydratedOffer): string {
  return offer.isChallenge ? "Scanner sur place" : "Y aller"
}

function descriptionFor(offer: HydratedOffer): string {
  const parts: string[] = []
  if (offer.description) parts.push(offer.description)
  const meta: string[] = []
  meta.push(offer.partnerLabel)
  if (offer.partnerCity) meta.push(offer.partnerCity)
  if (offer.discount_pct && offer.discount_pct > 0) {
    meta.push(`-${offer.discount_pct}%`)
  } else if (offer.price_dh && offer.price_dh > 0) {
    meta.push(`${offer.price_dh} DH`)
  }
  if (meta.length > 0) parts.push(meta.join(" • "))
  return parts.join(" — ")
}

function rewardCoins(offer: HydratedOffer): number {
  return Math.max(0, offer.price_coins ?? 0)
}

function rewardXp(offer: HydratedOffer): number {
  // Heuristic: challenges grant a small XP bump on scan; pure offers grant 0
  // XP at this surface (XP attribution happens server-side on scan/redeem).
  return offer.isChallenge ? 25 : 0
}

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------

export const dynamic = "force-dynamic"

export default async function TeenOffresPage() {
  const userInfo = await getUserRole()
  if (!userInfo || userInfo.role !== "teen") {
    redirect("/auth/redirect")
  }
  const teenId = userInfo.teenData?.id
  if (!teenId) {
    redirect("/teen")
  }

  const offers = await getRecommendedOffers(teenId).catch((err) => {
    console.error("[teen/offres] fatal:", err)
    return [] as HydratedOffer[]
  })

  // Best-effort impression capture — never await each call; never block render.
  for (const o of offers) {
    if (UUID_RE.test(o.id)) {
      recordSignalAsync({
        teenId,
        signalType: "view",
        targetType: "partner_offer",
        targetId: o.id,
        metadata: {
          surface: "teen_offres_list",
          score: o.score,
          tags: (o.tags ?? []).join(","),
        },
      })
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 ring-1 ring-emerald-400/30">
            <Sparkles className="h-4 w-4 text-emerald-300" aria-hidden />
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
            Wave 3 · Personalized
          </span>
        </div>
        <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl">
          Offres &amp; défis partenaires
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Sélection personnalisée selon tes centres d&apos;intérêt et ta ville.
          Scanne sur place pour les défis, fonce vers le partenaire pour les
          réductions.
        </p>
      </header>

      {/* Empty state */}
      {offers.length === 0 ? (
        <section
          aria-label="Aucune offre disponible"
          className="rounded-3xl border border-white/10 bg-zinc-950/50 p-8 text-center backdrop-blur-md"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
            <MapPin className="h-5 w-5 text-zinc-400" aria-hidden />
          </div>
          <h2 className="text-base font-black text-white">
            Pas encore d&apos;offres pour toi
          </h2>
          <p className="mx-auto mt-1 max-w-xs text-sm text-zinc-400">
            Affine tes centres d&apos;intérêt pour débloquer des défis et
            réductions chez nos partenaires près de chez toi.
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <Link
              href="/onboarding/interests"
              className="inline-flex items-center gap-1 rounded-full bg-white px-4 py-2 text-sm font-black text-black transition-colors hover:bg-white/90"
            >
              Choisir mes intérêts
            </Link>
            <Link
              href="/teen/map"
              className="inline-flex items-center gap-1 rounded-full bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition-colors hover:bg-white/15"
            >
              <MapPin className="h-3 w-3" aria-hidden />
              Voir la map
            </Link>
          </div>
        </section>
      ) : (
        <section
          aria-label="Offres recommandées"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        >
          {offers.map((o) => {
            const variant = variantFor(o)
            const ctaLabel = ctaLabelFor(o)
            const description = descriptionFor(o)
            const target = o.isChallenge
              ? `/teen/scan?offer=${encodeURIComponent(o.id)}`
              : (o.externalUrl ?? "/teen/map")

            return (
              <article key={o.id} className="relative">
                <DefiCard
                  type={variant}
                  title={o.title}
                  description={description}
                  xpReward={rewardXp(o)}
                  coinReward={rewardCoins(o)}
                  status="active"
                  iconName={o.isChallenge ? "QrCode" : "Tag"}
                  daysLeft={o.daysLeft ?? undefined}
                  // We render the CTA via a separate server-action <form>
                  // so signal capture happens before navigation. The
                  // DefiCard's internal `href` is intentionally omitted.
                />

                {/* Action: server-action form → records click signal → redirect */}
                <div className="-mt-3 px-5 pb-5">
                  <form action={trackAndGo} className="flex justify-end">
                    <input type="hidden" name="teen_id" value={teenId} />
                    <input type="hidden" name="offer_id" value={o.id} />
                    <input type="hidden" name="target" value={target} />
                    <input
                      type="hidden"
                      name="surface"
                      value="teen_offres_list"
                    />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[11px] font-black text-black transition-colors hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      aria-label={`${ctaLabel} — ${o.title}`}
                    >
                      {ctaLabel}
                    </button>
                  </form>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {/* Footer hint */}
      {offers.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-1 text-[11px] text-zinc-500">
          <RefreshCw className="h-3 w-3" aria-hidden />
          Le classement évolue selon tes signaux (vues, clics, scans).
        </p>
      ) : null}
    </main>
  )
}
