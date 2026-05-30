"use client"

/**
 * PRICING PLANS COMPONENT
 * =======================
 * Affichage des forfaits premium
 */

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Check,
  X,
  Star,
  Zap,
  Crown,
  Users,
  Sparkles,
  ChevronRight,
  Info,
  Gift,
  CreditCard,
  Wallet,
  Smartphone,
  Building2,
  Loader2,
} from "lucide-react"

// Types
interface Plan {
  id: string
  code: string
  name: string
  name_ar?: string
  description: string
  plan_type: string
  price_monthly: number
  price_quarterly: number
  price_yearly: number
  price_lifetime?: number
  currency: string
  discount_quarterly_percent: number
  discount_yearly_percent: number
  features: Record<string, unknown>
  color: string
  badge_label?: string
  trial_days: number
  is_featured: boolean
}

interface PricingPlansProps {
  onSelectPlan?: (plan: Plan, cycle: string) => void
  currentPlanCode?: string
}

// Icône par type de plan
const getPlanIcon = (type: string) => {
  const icons: Record<string, React.ReactNode> = {
    free: <Sparkles className="w-6 h-6" />,
    starter: <Zap className="w-6 h-6" />,
    pro: <Star className="w-6 h-6" />,
    elite: <Crown className="w-6 h-6" />,
    family: <Users className="w-6 h-6" />,
  }
  return icons[type] || <Sparkles className="w-6 h-6" />
}

// Labels des features
const FEATURE_LABELS: Record<string, string> = {
  max_circles: "Cercles d'amis",
  max_circle_members: "Membres par cercle",
  daily_challenges: "Défis quotidiens",
  cloud_storage_mb: "Stockage cloud",
  ad_free: "Sans publicités",
  xp_multiplier: "Bonus XP",
  custom_avatar: "Avatars personnalisés",
  priority_support: "Support prioritaire",
  exclusive_badges: "Badges exclusifs",
  analytics_dashboard: "Tableau de bord",
  custom_themes: "Thèmes personnalisés",
  early_access: "Accès anticipé",
  vip_events: "Événements VIP",
  max_family_members: "Membres famille",
}

// Composant Plan Card
function PlanCard({
  plan,
  cycle,
  isCurrentPlan,
  onSelect,
}: {
  plan: Plan
  cycle: "monthly" | "quarterly" | "yearly"
  isCurrentPlan: boolean
  onSelect: () => void
}) {
  const price = cycle === "monthly" ? plan.price_monthly :
                cycle === "quarterly" ? plan.price_quarterly :
                plan.price_yearly

  const monthlyEquivalent = cycle === "monthly" ? price :
                           cycle === "quarterly" ? price / 3 :
                           price / 12

  const discount = cycle === "quarterly" ? plan.discount_quarterly_percent :
                  cycle === "yearly" ? plan.discount_yearly_percent : 0

  const features = Object.entries(plan.features)
    .filter(([_, value]) => value !== false && value !== 0)
    .slice(0, 8)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-card rounded-2xl border overflow-hidden
        ${plan.is_featured ? "border-2" : "border-ink"}
        ${isCurrentPlan ? "ring-2 ring-lime" : ""}`}
      style={{ borderColor: plan.is_featured ? plan.color : undefined }}
    >
      {/* Badge */}
      {plan.badge_label && (
        <div
          className="absolute top-0 right-0 px-3 py-1 text-xs font-bold text-ink rounded-bl-lg"
          style={{ backgroundColor: plan.color }}
        >
          {plan.badge_label}
        </div>
      )}

      {isCurrentPlan && (
        <div className="absolute top-0 left-0 px-3 py-1 text-xs font-bold text-ink bg-lime rounded-br-lg">
          ACTUEL
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
          >
            {getPlanIcon(plan.plan_type)}
          </div>
          <div>
            <h3 className="text-xl font-bold text-ink">{plan.name}</h3>
            <p className="text-sm text-mute">{plan.description}</p>
          </div>
        </div>

        {/* Price */}
        <div className="mb-6">
          {plan.plan_type === "free" ? (
            <div className="text-3xl font-bold text-ink">Gratuit</div>
          ) : (
            <>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-ink">
                  {price.toFixed(0)}
                </span>
                <span className="text-mute">{plan.currency}</span>
                <span className="text-sm text-mute">
                  /{cycle === "monthly" ? "mois" : cycle === "quarterly" ? "3 mois" : "an"}
                </span>
              </div>
              {cycle !== "monthly" && (
                <p className="text-sm text-mute mt-1">
                  soit {monthlyEquivalent.toFixed(0)} {plan.currency}/mois
                  {discount > 0 && (
                    <span className="text-lime ml-2">-{discount}%</span>
                  )}
                </p>
              )}
              {plan.trial_days > 0 && (
                <p className="text-sm text-teal mt-2 flex items-center gap-1">
                  <Gift className="w-4 h-4" />
                  {plan.trial_days} jours d'essai gratuit
                </p>
              )}
            </>
          )}
        </div>

        {/* Features */}
        <ul className="space-y-3 mb-6">
          {features.map(([key, value]) => (
            <li key={key} className="flex items-center gap-3 text-sm">
              <Check className="w-4 h-4 text-lime flex-shrink-0" />
              <span className="text-ink-2">
                {FEATURE_LABELS[key] || key}
                {typeof value === "number" && value !== -1 && (
                  <span className="text-mute ml-1">
                    ({value === -1 ? "Illimité" : value.toString()})
                  </span>
                )}
                {typeof value === "number" && value === -1 && (
                  <span className="text-teal ml-1">(Illimité)</span>
                )}
                {key === "xp_multiplier" && typeof value === "number" && (
                  <span className="text-gold ml-1">×{value}</span>
                )}
              </span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onSelect}
          disabled={isCurrentPlan}
          className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2
            ${isCurrentPlan
              ? "bg-card text-mute cursor-not-allowed"
              : plan.is_featured
              ? "text-ink hover:opacity-90"
              : "bg-card text-ink hover:bg-muted"
            }`}
          style={{
            backgroundColor: !isCurrentPlan && plan.is_featured ? plan.color : undefined,
          }}
        >
          {isCurrentPlan ? (
            "Plan actuel"
          ) : plan.plan_type === "free" ? (
            "Utiliser gratuitement"
          ) : (
            <>
              <span>Choisir ce forfait</span>
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}

// Composant principal Pricing
export function PricingPlans({ onSelectPlan, currentPlanCode }: PricingPlansProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [cycle, setCycle] = useState<"monthly" | "quarterly" | "yearly">("yearly")

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const res = await fetch("/api/teen/subscription?type=plans")
        const data = await res.json()
        if (data.plans) setPlans(data.plans)
      } catch (err) {
        console.error("Error loading plans:", err)
      } finally {
        setLoading(false)
      }
    }
    loadPlans()
  }, [])

  const handleSelect = (plan: Plan) => {
    if (onSelectPlan) {
      onSelectPlan(plan, cycle)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-ink mb-2">
          Choisis ton forfait
        </h2>
        <p className="text-mute">
          Débloquez toutes les fonctionnalités premium
        </p>
      </div>

      {/* Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex bg-card rounded-xl p-1">
          {(["monthly", "quarterly", "yearly"] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative
                ${cycle === c ? "bg-teal text-ink" : "text-mute hover:text-ink"}`}
            >
              {c === "monthly" ? "Mensuel" : c === "quarterly" ? "Trimestriel" : "Annuel"}
              {c === "yearly" && (
                <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-lime text-[10px]
                  font-bold rounded-full text-ink">
                  -17%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {plans.filter(p => p.plan_type !== "school" && p.plan_type !== "lifetime").map((plan, idx) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <PlanCard
              plan={plan}
              cycle={cycle}
              isCurrentPlan={plan.code === currentPlanCode}
              onSelect={() => handleSelect(plan)}
            />
          </motion.div>
        ))}
      </div>

      {/* Payment methods */}
      <div className="text-center pt-8 border-t border-ink">
        <p className="text-sm text-mute mb-4">Moyens de paiement acceptés</p>
        <div className="flex justify-center gap-6 flex-wrap">
          <div className="flex items-center gap-2 text-mute">
            <CreditCard className="w-5 h-5" />
            <span className="text-sm">Carte bancaire</span>
          </div>
          <div className="flex items-center gap-2 text-mute">
            <Wallet className="w-5 h-5" />
            <span className="text-sm">Espèces</span>
          </div>
          <div className="flex items-center gap-2 text-mute">
            <Smartphone className="w-5 h-5" />
            <span className="text-sm">Mobile Money</span>
          </div>
          <div className="flex items-center gap-2 text-mute">
            <Building2 className="w-5 h-5" />
            <span className="text-sm">Via école</span>
          </div>
        </div>
      </div>

      {/* FAQ hint */}
      <div className="text-center">
        <a href="/aide/faq" className="text-sm text-teal hover:underline flex items-center justify-center gap-1">
          <Info className="w-4 h-4" />
          Questions fréquentes sur les forfaits
        </a>
      </div>
    </div>
  )
}

// Widget compact pour dashboard
export function PremiumBadge() {
  const [plan, setPlan] = useState<{
    plan_name: string
    plan_type: string
    current_period_end: string
  } | null>(null)

  useEffect(() => {
    const loadPlan = async () => {
      try {
        const res = await fetch("/api/teen/subscription?type=current")
        const data = await res.json()
        if (data.plan) setPlan(data.plan)
      } catch (err) {
        console.error("Error loading plan:", err)
      }
    }
    loadPlan()
  }, [])

  if (!plan || plan.plan_type === "free") {
    return (
      <a
        href="/premium"
        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal to-teal
          rounded-full text-ink text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Crown className="w-4 h-4" />
        <span>Passer Premium</span>
      </a>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-gold to-coral
      rounded-full text-ink text-sm font-medium">
      <Crown className="w-4 h-4" />
      <span>{plan.plan_name}</span>
    </div>
  )
}
