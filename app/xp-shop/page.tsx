import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { Sparkles, ShoppingBag, Zap } from 'lucide-react'

/**
 * Boutique XP - Page server component minimaliste.
 *
 * Lit la table `xp_shop_items` (migration 030_xp_shop.sql).
 * Si la table est absente (codes PGRST205 / 42P01), affiche un etat
 * "Bientot disponible" pour ne pas casser l'UX (audit AUDIT_LEVEL_UP_ET_DEFIS
 * Phase 1.3).
 */

export const dynamic = 'force-dynamic'

interface XpShopItem {
  id: string
  name: string
  description: string | null
  xp_cost: number
  image_url: string | null
  category: string | null
  available: boolean
}

async function fetchItems(): Promise<{ items: XpShopItem[]; tableMissing: boolean }> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('xp_shop_items')
      .select('id, name, description, xp_cost, image_url, category, available')
      .eq('available', true)
      .order('xp_cost', { ascending: true })

    if (error) {
      // Table absente cote PostgREST/Postgres
      if (error.code === 'PGRST205' || error.code === '42P01') {
        return { items: [], tableMissing: true }
      }
      console.error('[xp-shop] Supabase error:', error)
      return { items: [], tableMissing: false }
    }

    return { items: (data as XpShopItem[]) ?? [], tableMissing: false }
  } catch (err) {
    console.error('[xp-shop] Unexpected error:', err)
    return { items: [], tableMissing: true }
  }
}

export default async function XpShopPage() {
  const { items, tableMissing } = await fetchItems()

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="mx-auto max-w-5xl">
        <header className="mb-8 flex items-center gap-3">
          <ShoppingBag className="h-8 w-8 text-gen-z-coral" />
          <div>
            <h1 className="text-3xl font-black tracking-tight">Boutique XP</h1>
            <p className="text-sm text-muted-foreground">
              Depense tes XP contre des bonus, cosmetiques et items exclusifs.
            </p>
          </div>
        </header>

        {tableMissing && (
          <div className="rounded-3xl border border-border/40 bg-card p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-gen-z-lavender" />
            <h2 className="text-xl font-bold">Bientot disponible</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              La boutique XP est en cours de mise en place. Reviens bientot pour
              decouvrir des items exclusifs a debloquer avec tes XP.
            </p>
          </div>
        )}

        {!tableMissing && items.length === 0 && (
          <div className="rounded-3xl border border-border/40 bg-card p-8 text-center">
            <Sparkles className="mx-auto mb-3 h-10 w-10 text-gen-z-lavender" />
            <h2 className="text-xl font-bold">Aucun item disponible</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              De nouveaux items arrivent tres bientot.
            </p>
          </div>
        )}

        {items.length > 0 && (
          <ul
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            data-testid="xp-shop-items"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="group rounded-3xl border border-border/40 bg-card p-5 transition-colors hover:border-gen-z-lavender/40"
              >
                {item.image_url ? (
                  <div className="relative mb-4 aspect-video w-full overflow-hidden rounded-2xl bg-muted">
                    <Image
                      src={item.image_url}
                      alt={item.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="mb-4 flex aspect-video w-full items-center justify-center rounded-2xl bg-gradient-to-br from-gen-z-lavender/20 via-gen-z-coral/10 to-gen-z-lime/20">
                    <Sparkles className="h-10 w-10 text-gen-z-lavender" />
                  </div>
                )}

                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-bold leading-tight">{item.name}</h3>
                    {item.category && (
                      <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
                        {item.category}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gen-z-yellow/15 px-3 py-1 text-sm font-bold text-gen-z-yellow">
                    <Zap className="h-3.5 w-3.5" />
                    {item.xp_cost.toLocaleString('fr-FR')}
                  </span>
                </div>

                {item.description && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
