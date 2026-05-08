/**
 * /teen/food — discovery (Wave 3.2 food delivery).
 * Shows partner restaurants (sub_category in restaurant/cafe/bakery/...).
 *
 * V1.3-B mobile polish:
 * - Dock clearance hoisted to TeenLayout (no local pb-32 needed).
 * - h1 bumped to 4xl + font-black + italic to match teen surfaces.
 * - Native form controls min-h-11 (44px touch target, WCAG AAA).
 * - Design-system tokens (text-foreground / muted-foreground / primary)
 *   instead of raw text-gray-* / bg-blue-*.
 * - Filter strip uses flex-wrap so chips stack instead of overflowing.
 */

import Link from "next/link"
import { Utensils } from "lucide-react"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export const dynamic = "force-dynamic"

const SUB_CATEGORIES = ["restaurant", "cafe", "bakery", "fast_food", "catering", "grocery"] as const

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

  // Shared control class — 44px min-height for touch compliance, design-system tokens.
  const controlClass =
    "min-h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"

  return (
    <div className="mx-auto max-w-5xl">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-soft to-brand-soft">
          <Utensils className="h-6 w-6 text-black" aria-hidden />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase italic text-foreground leading-none">
            Food
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Restaurants partenaires Nivy. Halal par défaut, payable en coins.
          </p>
        </div>
      </header>

      <h2 className="sr-only">Filtres de recherche</h2>
      <form
        method="GET"
        aria-label="Filtres restaurants"
        className="mb-6 flex flex-wrap items-end gap-2 rounded-3xl border border-white/10 bg-white/[0.02] p-3 backdrop-blur-md"
      >
        <label htmlFor="food-sub-category" className="sr-only">
          Catégorie
        </label>
        <select
          id="food-sub-category"
          name="sub_category"
          defaultValue={sp.sub_category ?? ""}
          aria-label="Catégorie"
          className={controlClass}
        >
          <option value="">Toutes catégories</option>
          {SUB_CATEGORIES.map((s) => (
            <option key={s} value={s}>
              {s}
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
          className={controlClass}
        >
          <option value="">Tous tags</option>
          <option value="healthy">Healthy</option>
          <option value="vegetarian">Vegetarian</option>
          <option value="vegan">Vegan</option>
          <option value="gluten_free">Gluten-free</option>
        </select>
        <label className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="halal"
            value="true"
            defaultChecked={sp.halal === "true"}
            className="h-5 w-5 rounded accent-primary"
          />
          Halal only
        </label>
        <button
          type="submit"
          className="ml-auto inline-flex min-h-11 items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-black text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Filtrer
        </button>
      </form>

      <h2 className="sr-only">Restaurants partenaires</h2>
      {restaurants.length === 0 ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-3xl border border-white/10 bg-white/[0.02] p-12 text-center backdrop-blur-md"
        >
          <p className="text-sm text-muted-foreground">
            Aucun restaurant partenaire ne correspond.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {restaurants.map((p) => (
            <Link
              key={p.id}
              href={`/teen/food/${p.id}`}
              className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-white/20 hover:shadow-2xl hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <div className="font-bold text-foreground">{p.company_name}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {p.sub_category ?? "restaurant"}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
