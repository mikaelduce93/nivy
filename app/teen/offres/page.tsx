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
import { RefreshCw, ArrowRight } from "lucide-react"
import { getUserRole } from "@/lib/auth/get-user-role"
import { createClient } from "@/lib/supabase/server"
import { DefiCard, type DefiVariant } from "@/components/teen/defi-card"
import { recordSignal, recordSignalAsync } from "@/lib/analytics/signals"
import { Niv, NivEmpty } from "@/components/brand"

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
      <header className="mb-6 flex items-start gap-4">
        <Niv mood="hype" size={64} className="shrink-0" />
        <div>
          <p className="eyebrow tracking-[0.16em]">Rien que pour toi</p>
          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight text-ink">
            Offres &amp; <em className="font-semibold italic text-pink">défis</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Sélection personnalisée selon tes centres d&apos;intérêt et ta ville.
            Scanne sur place pour les défis, fonce vers le partenaire pour les
            réductions.
          </p>
        </div>
      </header>

      {/* Empty state */}
      {offers.length === 0 ? (
        <NivEmpty
          mood="happy"
          title="Pas encore d'offres pour toi"
          description="Affine tes centres d'intérêt pour débloquer des défis et réductions chez nos partenaires près de chez toi."
          action={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <a
                href="/onboarding/interests"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-pink px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
              >
                Choisir mes intérêts
              </a>
              <a
                href="/teen/map"
                className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-white px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md"
              >
                Voir la map
              </a>
            </div>
          }
        />
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
              <article key={o.id} className="flex flex-col">
                <DefiCard
                  type={variant}
                  title={o.title}
                  description={description}
                  xpReward={rewardXp(o)}
                  coinReward={rewardCoins(o)}
                  status="active"
                  iconName={o.isChallenge ? "QrCode" : "Tag"}
                  daysLeft={o.daysLeft ?? undefined}
                  className="flex-1 rounded-b-none border-b-0"
                  // We render the CTA via a separate server-action <form>
                  // so signal capture happens before navigation. The
                  // DefiCard's internal `href` is intentionally omitted.
                />

                {/* Action: server-action form → records click signal → redirect.
                    Rendu flush sous la carte (continuité du sticker), bordure 2px. */}
                <form
                  action={trackAndGo}
                  className="flex justify-end rounded-b-2xl border-2 border-t-0 border-ink bg-white px-5 py-3"
                >
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
                    className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-ink px-3 py-1.5 font-mono text-[11px] font-bold text-paper transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-pink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
                    aria-label={`${ctaLabel} — ${o.title}`}
                  >
                    {ctaLabel}
                    <ArrowRight className="h-3 w-3" aria-hidden />
                  </button>
                </form>
              </article>
            )
          })}
        </section>
      )}

      {/* Footer hint */}
      {offers.length > 0 ? (
        <p className="mt-6 flex items-center justify-center gap-1 text-[11px] text-mute">
          <RefreshCw className="h-3 w-3" aria-hidden />
          Le classement évolue selon tes signaux (vues, clics, scans).
        </p>
      ) : null}
    </main>
  )
}
