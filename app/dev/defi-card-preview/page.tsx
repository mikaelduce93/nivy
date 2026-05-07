/**
 * Dev-only preview for <DefiCard>.
 *
 * Renders one card per variant + selected status combinations so a human
 * (or screenshot diff) can sanity-check the visual language before B2/B3
 * integrate the component across the teen surfaces.
 *
 * Not linked anywhere; production access is blocked via the NODE_ENV guard.
 */

import { notFound } from "next/navigation"
import { DefiCard } from "@/components/teen/defi-card"

export const dynamic = "force-dynamic"

export default function DefiCardPreviewPage() {
  if (process.env.NODE_ENV === "production") {
    notFound()
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-white sm:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header>
          <h1 className="text-2xl font-black sm:text-3xl">DefiCard — preview</h1>
          <p className="mt-1 text-sm text-zinc-400">
            One tile per variant. Visual smoke-test for V1.1 P2.1 (B1 → B2/B3).
          </p>
        </header>

        <Section title="Variants — active state with progress">
          <Grid>
            <DefiCard
              type="daily"
              title="Bois 8 verres d'eau"
              description="Reste hydraté toute la journée pour ton défi quotidien."
              xpReward={50}
              coinReward={10}
              status="active"
              progress={{ current: 5, target: 8 }}
              daysLeft={0}
              href="/teen/quests/daily-water"
              ctaLabel="Continuer"
            />
            <DefiCard
              type="weekly"
              title="3 séances de sport"
              description="Trois entraînements minimum cette semaine. Tu es bien parti."
              xpReward={250}
              coinReward={50}
              status="active"
              progress={{ current: 2, target: 3 }}
              daysLeft={4}
              href="/teen/quests/weekly-sport"
              ctaLabel="Voir le défi"
            />
            <DefiCard
              type="monthly"
              title="Lis 4 livres ce mois-ci"
              description="Une mission longue durée pour développer ton intellect."
              xpReward={800}
              coinReward={200}
              status="active"
              progress={{ current: 1, target: 4 }}
              daysLeft={18}
              href="/teen/quests/monthly-read"
              ctaLabel="Suivre"
            />
            <DefiCard
              type="seasonal"
              title="Été 2026 — Aventurier"
              description="Une saison entière pour cumuler 10 expériences hors de la maison."
              xpReward={3000}
              coinReward={1000}
              status="active"
              progress={{ current: 3, target: 10 }}
              daysLeft={62}
              iconName="Sparkles"
              href="/teen/quests/season-summer"
              ctaLabel="Découvrir"
            />
            <DefiCard
              type="physical"
              title="Marathon 5 km"
              description="Cours 5 kilomètres sans pause. Track-toi avec ton coach."
              xpReward={500}
              coinReward={100}
              status="active"
              progress={{ current: 3200, target: 5000 }}
              imageUrl="https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=800&q=80"
              daysLeft={7}
              href="/teen/defis-physiques/marathon-5k"
              ctaLabel="Démarrer"
            />
            <DefiCard
              type="friend"
              title="Battle de pompes vs. Yanis"
              description="Premier à 100 pompes cette semaine remporte 200 XP bonus."
              xpReward={200}
              coinReward={20}
              status="active"
              progress={{ current: 42, target: 100 }}
              daysLeft={3}
              href="/teen/friends/defis/yanis-pompes"
              ctaLabel="Relever"
            />
          </Grid>
        </Section>

        <Section title="States — completed / locked / expired">
          <Grid>
            <DefiCard
              type="daily"
              title="Bois 8 verres d'eau"
              description="Mission terminée. Bravo champion."
              xpReward={50}
              coinReward={10}
              status="completed"
              progress={{ current: 8, target: 8 }}
            />
            <DefiCard
              type="monthly"
              title="Niveau 10 requis"
              description="Atteins le niveau 10 pour débloquer ce défi mensuel."
              xpReward={800}
              status="locked"
            />
            <DefiCard
              type="seasonal"
              title="Hiver 2025 — Polaire"
              description="La saison est terminée. Reviens cet hiver."
              xpReward={3000}
              status="expired"
              progress={{ current: 6, target: 10 }}
            />
          </Grid>
        </Section>

        <Section title="Minimal — no description, no progress, no CTA">
          <Grid>
            <DefiCard
              type="daily"
              title="Lit fait au réveil"
              xpReward={20}
              status="active"
            />
            <DefiCard
              type="weekly"
              title="Pas de réseaux après 22h"
              xpReward={150}
              coinReward={30}
              status="active"
              daysLeft={5}
            />
            <DefiCard
              type="friend"
              title="Défi surprise"
              xpReward={100}
              status="active"
              iconName="Heart"
            />
          </Grid>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">{title}</h2>
      {children}
    </section>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  )
}
