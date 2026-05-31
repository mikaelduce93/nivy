/**
 * /teen/food — discovery (Wave 3.2 food delivery).
 * Shows partner restaurants (sub_category in restaurant/cafe/bakery/...).
 *
 * Refonte V2 (#158) — charte paper néo-brutaliste :
 * - Hero éditorial (eyebrow mono + <em> rose) à la place de l'ancien titre gen-z.
 * - Restaurants en <StickerCard variant="hover"> (bordure 2px ink + ombre dure).
 * - Catégories franchies en FR mono ; filtres en pills <StickerTab>.
 * - États vides via <NivEmpty>.
 * - Préserve getRestaurants/searchParams + le morph vt-restaurant côté détail.
 */

import Link from "next/link"
import { Utensils, Coffee, Croissant, Sandwich, ShoppingBasket, ChefHat } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { H2 } from "@/components/ui/headings"
import { PullToRefresh } from "@/components/teen/pull-to-refresh"
import { StickerCard } from "@/components/ui/sticker-card"
import { NivEmpty } from "@/components/brand"

export const dynamic = "force-dynamic"

const SUB_CATEGORIES = ["restaurant", "cafe", "bakery", "fast_food", "catering", "grocery"] as const

// Libellés FR + icône par catégorie (présentation seulement, pas de source BDD).
const SUB_CATEGORY_META: Record<
  string,
  { label: string; icon: typeof Utensils }
> = {
  restaurant: { label: "Restaurant", icon: Utensils },
  cafe: { label: "Café", icon: Coffee },
  bakery: { label: "Boulangerie", icon: Croissant },
  fast_food: { label: "Fast-food", icon: Sandwich },
  catering: { label: "Traiteur", icon: ChefHat },
  grocery: { label: "Épicerie", icon: ShoppingBasket },
}

const TAG_LABELS: Record<string, string> = {
  healthy: "Sain",
  vegetarian: "Végétarien",
  vegan: "Végan",
  gluten_free: "Sans gluten",
}

interface Partner {
  id: string
  company_name: string
  sub_category: string | null
}

async function getRestaurants(filters: {
  sub_category?: string
  halal?: boolean
  tag?: string
}) {
  const sb = createServiceRoleClient()
  const query = sb
    .from("partners")
    .select("id, company_name, sub_category")
    .eq("status", "active")
    .in(
      "sub_category",
      filters.sub_category
        ? [filters.sub_category]
        : (SUB_CATEGORIES as unknown as string[])
    )
  const { data } = await query
  let result = (data ?? []) as Partner[]

  if (filters.halal || filters.tag) {
    const ids = result.map((p) => p.id)
    if (ids.length) {
      let mq = sb
        .from("menu_items")
        .select("partner_id")
        .in("partner_id", ids)
        .eq("is_active", true)
      if (filters.halal) mq = mq.eq("is_halal", true)
      if (filters.tag) mq = mq.contains("nutrition_tags", [filters.tag])
      const { data: hits } = await mq
      const ok = new Set((hits ?? []).map((r) => r.partner_id as string))
      result = result.filter((p) => ok.has(p.id))
    }
  }
  return result
}

export default async function TeenFoodDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const restaurants = await getRestaurants({
    sub_category: sp.sub_category,
    halal: sp.halal === "true",
    tag: sp.tag,
  })

  // Pill filtre charte : actif = fond ink + texte paper + ombre rose + lift.
  const pillBase =
    "inline-flex min-h-11 items-center gap-1.5 rounded-xl border-2 border-ink px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[0.12em] transition-all"
  const pillIdle = "bg-white text-mute hover:text-ink"
  const pillActive =
    "-translate-x-0.5 -translate-y-0.5 bg-ink text-paper shadow-stkr-pink motion-reduce:translate-x-0 motion-reduce:translate-y-0"

  return (
    <PullToRefresh>
    <div className="mx-auto max-w-5xl space-y-8 pt-6">
      <header className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-coral/20">
          <Utensils className="h-7 w-7 text-ink" aria-hidden />
        </div>
        <div>
          <p className="eyebrow tracking-[0.16em]">Food halal · payable en coins</p>
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            Ta <em className="font-semibold italic text-pink">food</em>
          </h1>
          <p className="mt-1 text-sm text-mute">
            Restaurants partenaires Nivy. Halal par défaut, payable en coins.
          </p>
        </div>
      </header>

      <H2 className="sr-only">Filtres de recherche</H2>
      <form
        method="GET"
        aria-label="Filtres restaurants"
        className="flex flex-wrap items-end gap-2 rounded-2xl border-2 border-ink bg-white p-3 shadow-stkr-sm"
      >
        <label htmlFor="food-sub-category" className="sr-only">
          Catégorie
        </label>
        <select
          id="food-sub-category"
          name="sub_category"
          defaultValue={sp.sub_category ?? ""}
          aria-label="Catégorie"
          className="min-h-11 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
        >
          <option value="">Toutes catégories</option>
          {SUB_CATEGORIES.map((s) => (
            <option key={s} value={s}>
              {SUB_CATEGORY_META[s]?.label ?? s}
            </option>
          ))}
        </select>
        <label htmlFor="food-tag" className="sr-only">
          Tag nutrition
        </label>
        <select
          id="food-tag"
          name="tag"
          defaultValue={sp.tag ?? ""}
          aria-label="Tag nutrition"
          className="min-h-11 rounded-xl border-2 border-ink bg-white px-3 py-2 text-sm text-ink focus:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
        >
          <option value="">Tous les tags</option>
          {Object.entries(TAG_LABELS).map(([slug, label]) => (
            <option key={slug} value={slug}>
              {label}
            </option>
          ))}
        </select>
        <label className={`${pillBase} ${sp.halal === "true" ? pillActive : pillIdle} cursor-pointer`}>
          <input
            type="checkbox"
            name="halal"
            value="true"
            defaultChecked={sp.halal === "true"}
            className="sr-only"
          />
          Halal
        </label>
        <button
          type="submit"
          className="ml-auto inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-ink bg-pink px-4 py-2 text-sm font-bold text-ink transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-stkr-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-pink/40"
        >
          Filtrer
        </button>
      </form>

      <H2 className="sr-only">Restaurants partenaires</H2>
      {restaurants.length === 0 ? (
        <NivEmpty
          mood="proud"
          title="Aucun resto sur ces filtres"
          description="Élargis ta recherche w sahbi, ou reviens un peu plus tard — on signe de nouveaux restos chaque semaine."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((p) => {
            const meta = p.sub_category
              ? SUB_CATEGORY_META[p.sub_category]
              : undefined
            const Icon = meta?.icon ?? Utensils
            return (
              <Link
                key={p.id}
                href={`/teen/food/${p.id}`}
                className="rounded-2xl focus-visible:outline-none"
              >
                <StickerCard variant="hover" className="h-full gap-3 p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-coral/15">
                      <Icon className="h-5 w-5 text-ink" aria-hidden />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-display font-bold leading-tight text-ink">
                        {p.company_name}
                      </h3>
                      <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-mute">
                        {meta?.label ?? "Restaurant"}
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex w-fit items-center gap-1 rounded-full border-2 border-ink bg-coral/15 px-2.5 py-0.5 font-mono text-[11px] font-bold text-ink">
                    ⊙ accepte tes coins
                  </span>
                </StickerCard>
              </Link>
            )
          })}
        </div>
      )}
    </div>
    </PullToRefresh>
  )
}
