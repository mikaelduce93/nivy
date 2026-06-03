"use client"

/**
 * <TwinCurrencyGauge> — Wave 1 cross-cutting component (FRONTEND_REDO).
 *
 * Per whitepaper §5 (and §29 #1: "no convert"):
 *   - XP = effort credit. Earned via quests/streaks/challenges. Never converts to coins.
 *   - Coins = DH-prepaid spending currency (1 DH = 100 coins, parent-funded).
 *
 * Both currencies must be visible side-by-side on every teen-facing wallet
 * surface so the distinction stays cognitively clear at every interaction.
 * NO arrow / NO conversion UI between them — they live in parallel rails.
 *
 * Two variants:
 *   - 'compact'  → horizontal pill (page headers, e.g. quests hub)
 *   - 'full'     → stacked card with progress bars + DH equivalent (dashboard, wallet)
 *
 * The component is purely presentational — values are sourced upstream
 * (lib/server/teen-dashboard.ts → user_coins.balance, profiles.total_xp).
 */

import { motion } from "framer-motion"
import { Zap, Coins } from "lucide-react"
import { cn } from "@/lib/utils"

export interface TwinCurrencyGaugeProps {
  xp: number
  level: number
  /** Total XP needed to reach the next level (size of the bar, not absolute target). */
  xpToNextLevel?: number
  /** XP already accumulated inside the current level (numerator of the bar). */
  xpInLevel?: number
  coins: number
  /** Coins minus locked savings goals. If undefined or equal to coins, the subline hides. */
  spendableCoins?: number
  variant?: "compact" | "full"
  className?: string
}

/** 1 DH = 100 coins (whitepaper §5 — fixed peg). */
const COINS_PER_DH = 100

function formatDH(coins: number): string {
  return `${(coins / COINS_PER_DH).toFixed(2)} DH`
}

export function TwinCurrencyGauge({
  xp,
  level,
  xpToNextLevel,
  xpInLevel,
  coins,
  spendableCoins,
  variant = "full",
  className,
}: TwinCurrencyGaugeProps) {
  const safeXp = Math.max(0, xp || 0)
  const safeCoins = Math.max(0, coins || 0)
  const safeSpendable =
    typeof spendableCoins === "number" ? Math.max(0, spendableCoins) : safeCoins
  const hasLocked = safeSpendable < safeCoins

  // Progress bar for level — clamp 0–100. Default xpToNextLevel = 1 to avoid div0.
  const denominator = Math.max(1, xpToNextLevel || 0)
  const numerator = Math.max(0, Math.min(denominator, xpInLevel ?? 0))
  const progressPct = Math.round((numerator / denominator) * 100)

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex items-stretch gap-0 rounded-2xl border-2 border-ink bg-card",
          className
        )}
        role="group"
        aria-label="Solde XP et coins"
      >
        {/* XP pill — accent or (charte §6) */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          title="XP — effort, ne se convertit jamais en coins"
        >
          <Zap className="w-3.5 h-3.5 text-gold" />
          <span className="font-black text-sm text-ink tabular-nums">
            {safeXp.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-mute">
            XP
          </span>
          <span className="ml-1 px-1.5 py-0.5 rounded-md border border-ink bg-warning-soft text-ink text-[10px] font-bold">
            Lv {level}
          </span>
        </div>

        {/* Mur encre — « devises différentes, aucune conversion » */}
        <div className="w-0.5 bg-ink" aria-hidden="true" />

        {/* Coins pill — accent corail (charte §6) */}
        <div
          className="flex items-center gap-2 px-3 py-2"
          title="Coins — monnaie pré-payée par tes parents (1 DH = 100 coins)"
        >
          <Coins className="w-3.5 h-3.5 text-coral" />
          <span className="font-black text-sm text-ink tabular-nums">
            {safeCoins.toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-wider text-mute">
            coins
          </span>
          <span className="ml-1 text-[10px] text-mute tabular-nums">
            ≈ {formatDH(safeCoins)}
          </span>
        </div>
      </div>
    )
  }

  // ---- FULL variant — îlot sombre charte (or/corail haute lisibilité) ----
  return (
    <div
      className={cn(
        "rounded-2xl border-2 border-ink bg-[linear-gradient(135deg,var(--night-2),var(--night))] text-paper overflow-hidden shadow-stkr-md",
        className
      )}
      role="group"
      aria-label="Solde double devise — XP et coins"
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr]">
        {/* ---- XP side — accent or (charte §6) ---- */}
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-paper/10 flex items-center justify-center">
                <Zap className="w-4 h-4 text-gold" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-gold font-bold">
                Effort · XP
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-lg bg-paper/10 text-gold text-[10px] font-black uppercase tracking-wider">
              Lv {level}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-gold tabular-nums leading-none">
              {safeXp.toLocaleString()}
            </span>
            <span className="text-sm text-paper/60 font-bold uppercase tracking-wider">
              XP
            </span>
          </div>

          {/* Level progress bar */}
          {xpToNextLevel !== undefined && xpToNextLevel > 0 && (
            <div className="mt-4">
              <div className="h-1.5 rounded-full bg-paper/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="h-full bg-gold"
                />
              </div>
              <p className="mt-1.5 text-[10px] text-paper/60 tabular-nums">
                {numerator.toLocaleString()} / {denominator.toLocaleString()} XP
                vers niveau {level + 1}
              </p>
            </div>
          )}

          <p className="mt-3 text-[10px] text-paper/50 leading-snug">
            Gagné via quêtes, streaks, défis. Ne se convertit pas en coins.
          </p>
        </motion.div>

        {/* ---- Mur central (pas de flèche → aucune conversion) ---- */}
        <div
          className="hidden sm:flex items-center justify-center px-1"
          aria-hidden="true"
        >
          <div className="w-px h-3/4 bg-paper/15" />
        </div>
        <div className="sm:hidden h-px w-full bg-paper/15" aria-hidden="true" />

        {/* ---- Coins side — accent corail (charte §6) ---- */}
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35 }}
          className="relative p-5 sm:p-6"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-paper/10 flex items-center justify-center">
                <Coins className="w-4 h-4 text-coral" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.18em] text-coral font-bold">
                Dépense · Coins
              </span>
            </div>
            <span className="text-[10px] text-paper/60 tabular-nums">
              ≈ {formatDH(safeCoins)}
            </span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-coral tabular-nums leading-none">
              {safeCoins.toLocaleString()}
            </span>
            <span className="text-sm text-paper/60 font-bold uppercase tracking-wider">
              coins
            </span>
          </div>

          {hasLocked ? (
            <div className="mt-4 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-paper/70">Disponible</span>
                <span className="font-black text-coral tabular-nums">
                  {safeSpendable.toLocaleString()}{" "}
                  <span className="text-paper/50 font-medium">
                    ({formatDH(safeSpendable)})
                  </span>
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-paper/50">Bloqué (épargne)</span>
                <span className="text-paper/70 tabular-nums">
                  {(safeCoins - safeSpendable).toLocaleString()}
                </span>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-[11px] text-paper/60">
              Disponible à dépenser intégralement.
            </p>
          )}

          <p className="mt-3 text-[10px] text-paper/50 leading-snug">
            Pré-payé par tes parents (1 DH = 100 coins). Indépendant des XP.
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default TwinCurrencyGauge
