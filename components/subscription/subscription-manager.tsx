"use client"

/**
 * SUBSCRIPTION MANAGER COMPONENT
 * ==============================
 * Gestion de l'abonnement utilisateur
 */

import { useState, useEffect } from "react"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import {
  Crown,
  Calendar,
  CreditCard,
  RefreshCw,
  AlertTriangle,
  Check,
  X,
  ChevronRight,
  Users,
  Settings,
  History,
  Gift,
  Loader2,
  Pause,
  Play,
  UserPlus,
  Trash2,
  Shield,
} from "lucide-react"

// Types
interface Subscription {
  subscription_id: string
  plan_id: string
  plan_code: string
  plan_name: string
  plan_type: string
  status: string
  current_period_end: string
  features: Record<string, unknown>
  is_family_member: boolean
}

interface Payment {
  id: string
  amount: number
  currency: string
  payment_method: string
  status: string
  created_at: string
  plan: { name: string }
}

interface FamilyMember {
  id: string
  user_id: string
  role: string
  status: string
  user: {
    username: string
    display_name: string
    avatar_url: string
  }
}

// Composant principal
export function SubscriptionManager() {
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"overview" | "payments" | "family" | "settings">("overview")
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [subRes, payRes] = await Promise.all([
          fetch("/api/teen/subscription?type=current"),
          fetch("/api/teen/subscription?type=payments&limit=5"),
        ])

        const subData = await subRes.json()
        const payData = await payRes.json()

        if (subData.plan) setSubscription(subData.plan)
        if (payData.payments) setPayments(payData.payments)
      } catch (err) {
        console.error("Error loading subscription:", err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  const handleCancel = async (immediate: boolean) => {
    setProcessing(true)
    try {
      const res = await fetch("/api/teen/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cancel",
          immediate,
          reason: "User requested cancellation",
        }),
      })

      const data = await res.json()
      if (data.success) {
        // Recharger les données
        window.location.reload()
      }
    } catch (err) {
      console.error("Error cancelling:", err)
    } finally {
      setProcessing(false)
      setShowCancelModal(false)
    }
  }

  const handlePause = async () => {
    setProcessing(true)
    try {
      const res = await fetch("/api/teen/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pause" }),
      })

      const data = await res.json()
      if (data.success) {
        setSubscription((prev) => prev ? { ...prev, status: "paused" } : null)
      }
    } catch (err) {
      console.error("Error pausing:", err)
    } finally {
      setProcessing(false)
    }
  }

  const handleResume = async () => {
    setProcessing(true)
    try {
      const res = await fetch("/api/teen/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resume" }),
      })

      const data = await res.json()
      if (data.success) {
        setSubscription((prev) => prev ? { ...prev, status: "active" } : null)
      }
    } catch (err) {
      console.error("Error resuming:", err)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    )
  }

  if (!subscription || subscription.plan_type === "free") {
    return (
      <div className="bg-card rounded-2xl border border-ink p-8 text-center">
        <Crown className="w-16 h-16 text-mute mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-ink mb-2">
          Aucun abonnement actif
        </h2>
        <p className="text-mute mb-6">
          Passe à Premium pour débloquer toutes les fonctionnalités!
        </p>
        <a
          href="/premium"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal to-teal
            rounded-xl text-ink font-semibold hover:opacity-90 transition-opacity"
        >
          <Crown className="w-5 h-5" />
          Voir les forfaits
        </a>
      </div>
    )
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      active: { color: "bg-lime", label: "Actif" },
      trial: { color: "bg-teal", label: "Essai" },
      paused: { color: "bg-gold", label: "En pause" },
      cancelled: { color: "bg-destructive", label: "Annulé" },
      past_due: { color: "bg-coral", label: "Paiement dû" },
    }
    const badge = badges[status] || { color: "bg-muted", label: status }
    return (
      <span className={`px-2 py-0.5 ${badge.color} text-ink text-xs font-medium rounded-full`}>
        {badge.label}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-gradient-to-r from-teal/10 to-teal/10 rounded-2xl border border-teal/20 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-teal to-teal rounded-2xl
              flex items-center justify-center">
              <Crown className="w-8 h-8 text-ink" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-ink">{subscription.plan_name}</h2>
                {getStatusBadge(subscription.status)}
              </div>
              {subscription.is_family_member && (
                <p className="text-sm text-teal flex items-center gap-1 mt-1">
                  <Users className="w-4 h-4" />
                  Membre d'un abonnement famille
                </p>
              )}
              {subscription.current_period_end && (
                <p className="text-sm text-mute mt-1">
                  {subscription.status === "cancelled" ? "Se termine le " : "Renouvellement le "}
                  {formatDate(subscription.current_period_end)}
                </p>
              )}
            </div>
          </div>

          <a
            href="/premium"
            className="px-4 py-2 bg-card rounded-lg text-sm font-medium text-ink
              hover:bg-muted transition-colors flex items-center gap-2"
          >
            Changer de forfait
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-ink pb-2">
        {[
          { key: "overview", label: "Aperçu", icon: Crown },
          { key: "payments", label: "Paiements", icon: CreditCard },
          { key: "family", label: "Famille", icon: Users },
          { key: "settings", label: "Paramètres", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${activeTab === tab.key
                ? "bg-teal/10 text-teal"
                : "text-mute hover:text-ink hover:bg-card"
              }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid gap-6 md:grid-cols-2"
          >
            {/* Features */}
            <div className="bg-card rounded-xl border border-ink p-6">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-teal" />
                Fonctionnalités incluses
              </h3>
              <ul className="space-y-3">
                {Object.entries(subscription.features)
                  .filter(([_, v]) => v !== false && v !== 0)
                  .map(([key, value]) => (
                    <li key={key} className="flex items-center justify-between text-sm">
                      <span className="text-ink-2">{key.replace(/_/g, " ")}</span>
                      <span className="text-teal font-medium">
                        {value === true || value === -1
                          ? "✓"
                          : typeof value === "number" && key === "xp_multiplier"
                          ? `×${value}`
                          : String(value)}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>

            {/* Quick Actions */}
            <div className="bg-card rounded-xl border border-ink p-6">
              <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-teal" />
                Actions rapides
              </h3>
              <div className="space-y-3">
                {subscription.status === "active" && (
                  <button
                    onClick={handlePause}
                    disabled={processing}
                    className="w-full py-3 bg-card rounded-lg hover:bg-muted transition-colors
                      flex items-center justify-center gap-2 text-ink"
                  >
                    <Pause className="w-4 h-4" />
                    Mettre en pause
                  </button>
                )}

                {subscription.status === "paused" && (
                  <button
                    onClick={handleResume}
                    disabled={processing}
                    className="w-full py-3 bg-teal rounded-lg hover:bg-teal transition-colors
                      flex items-center justify-center gap-2 text-ink"
                  >
                    <Play className="w-4 h-4" />
                    Reprendre
                  </button>
                )}

                <a
                  href="/premium"
                  className="w-full py-3 bg-card rounded-lg hover:bg-muted transition-colors
                    flex items-center justify-center gap-2 text-ink"
                >
                  <RefreshCw className="w-4 h-4" />
                  Changer de forfait
                </a>

                <button
                  onClick={() => setShowCancelModal(true)}
                  className="w-full py-3 border border-destructive/30 rounded-lg hover:bg-destructive/10
                    transition-colors flex items-center justify-center gap-2 text-destructive"
                >
                  <X className="w-4 h-4" />
                  Annuler l'abonnement
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "payments" && (
          <motion.div
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-xl border border-ink p-6"
          >
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-teal" />
              Historique des paiements
            </h3>

            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-4 bg-card rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-mute" />
                      </div>
                      <div>
                        <p className="text-ink font-medium">{payment.plan?.name}</p>
                        <p className="text-sm text-mute">
                          {formatDate(payment.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-ink font-medium">
                        {payment.amount} {payment.currency}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full
                        ${payment.status === "completed" ? "bg-lime/20 text-lime" :
                          payment.status === "pending" ? "bg-gold/20 text-gold" :
                          "bg-destructive/20 text-destructive"}`}
                      >
                        {payment.status === "completed" ? "Payé" :
                         payment.status === "pending" ? "En attente" : "Échoué"}
                      </span>
                    </div>
                  </div>
                ))}

                <a
                  href="/subscription/payments"
                  className="block text-center text-sm text-teal hover:underline py-2"
                >
                  Voir tout l'historique
                </a>
              </div>
            ) : (
              <p className="text-mute text-center py-8">Aucun paiement enregistré</p>
            )}
          </motion.div>
        )}

        {activeTab === "family" && (
          <FamilyTab subscription={subscription} />
        )}

        {activeTab === "settings" && (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-card rounded-xl border border-ink p-6"
          >
            <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-teal" />
              Paramètres d'abonnement
            </h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                <div>
                  <p className="text-ink font-medium">Renouvellement automatique</p>
                  <p className="text-sm text-mute">
                    Renouveler automatiquement à la fin de la période
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer
                    peer-checked:after:translate-x-full peer-checked:after:border-ink
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                    after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                    peer-checked:bg-teal"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-card rounded-lg">
                <div>
                  <p className="text-ink font-medium">Notifications de paiement</p>
                  <p className="text-sm text-mute">
                    Recevoir un rappel avant le renouvellement
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer
                    peer-checked:after:translate-x-full peer-checked:after:border-ink
                    after:content-[''] after:absolute after:top-[2px] after:left-[2px]
                    after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all
                    peer-checked:bg-teal"></div>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70"
            onClick={() => setShowCancelModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card rounded-2xl border border-ink p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Annuler l'abonnement</h3>
                  <p className="text-sm text-mute">Cette action est irréversible</p>
                </div>
              </div>

              <p className="text-mute mb-6">
                Es-tu sûr de vouloir annuler ton abonnement {subscription.plan_name}?
                Tu perdras l'accès à toutes les fonctionnalités premium.
              </p>

              <div className="space-y-3">
                <button
                  onClick={() => handleCancel(false)}
                  disabled={processing}
                  className="w-full py-3 bg-card rounded-lg hover:bg-muted transition-colors
                    text-ink font-medium"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    "Annuler à la fin de la période"
                  )}
                </button>

                <button
                  onClick={() => handleCancel(true)}
                  disabled={processing}
                  className="w-full py-3 border border-destructive/30 rounded-lg hover:bg-destructive/10
                    transition-colors text-destructive font-medium"
                >
                  Annuler immédiatement
                </button>

                <button
                  onClick={() => setShowCancelModal(false)}
                  className="w-full py-3 text-mute hover:text-ink transition-colors"
                >
                  Garder mon abonnement
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Family Tab Component
function FamilyTab({ subscription }: { subscription: Subscription }) {
  const [family, setFamily] = useState<{
    id: string
    max_members: number
    family_name: string
    members: FamilyMember[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviting, setInviting] = useState(false)

  useEffect(() => {
    const loadFamily = async () => {
      try {
        const res = await fetch("/api/teen/subscription?type=family")
        const data = await res.json()
        if (data.family) setFamily(data.family)
      } catch (err) {
        console.error("Error loading family:", err)
      } finally {
        setLoading(false)
      }
    }
    loadFamily()
  }, [])

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return

    setInviting(true)
    try {
      const res = await fetch("/api/teen/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "invite_family_member",
          email: inviteEmail,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setInviteEmail("")
        // Recharger les données
        window.location.reload()
      }
    } catch (err) {
      console.error("Error inviting:", err)
    } finally {
      setInviting(false)
    }
  }

  if (subscription.plan_type !== "family") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-card rounded-xl border border-ink p-8 text-center"
      >
        <Users className="w-12 h-12 text-mute mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-ink mb-2">
          Forfait Famille non actif
        </h3>
        <p className="text-mute mb-4">
          Passe au forfait Famille pour partager avec jusqu'à 5 membres
        </p>
        <a
          href="/premium"
          className="inline-flex items-center gap-2 px-4 py-2 bg-pink rounded-lg
            text-ink font-medium hover:bg-pink transition-colors"
        >
          <Users className="w-4 h-4" />
          Voir le forfait Famille
        </a>
      </motion.div>
    )
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-teal animate-spin" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Invite */}
      <div className="bg-card rounded-xl border border-ink p-6">
        <h3 className="text-lg font-semibold text-ink mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-teal" />
          Inviter un membre
        </h3>

        <div className="flex gap-3">
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="Email ou nom d'utilisateur"
            className="flex-1 bg-card rounded-lg px-4 py-2 text-ink
              placeholder:text-mute border border-ink focus:border-teal
              focus:outline-none"
          />
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 bg-teal rounded-lg text-ink font-medium
              hover:bg-teal disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors"
          >
            {inviting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Inviter"}
          </button>
        </div>

        {family && (
          <p className="text-sm text-mute mt-2">
            {family.members?.length || 0}/{family.max_members} membres
          </p>
        )}
      </div>

      {/* Members */}
      <div className="bg-card rounded-xl border border-ink p-6">
        <h3 className="text-lg font-semibold text-ink mb-4">Membres de la famille</h3>

        {family?.members && family.members.length > 0 ? (
          <div className="space-y-3">
            {family.members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-card rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {member.user.avatar_url ? (
                    <Image
                      src={member.user.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal to-teal
                      flex items-center justify-center text-ink font-bold">
                      {member.user.display_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-ink font-medium">{member.user.display_name}</p>
                    <p className="text-sm text-mute">@{member.user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full
                    ${member.status === "active" ? "bg-lime/20 text-lime" :
                      "bg-gold/20 text-gold"}`}
                  >
                    {member.status === "active" ? "Actif" : "En attente"}
                  </span>
                  {member.role !== "owner" && (
                    <button className="p-1 hover:bg-muted rounded transition-colors">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-mute text-center py-4">Aucun membre invité</p>
        )}
      </div>
    </motion.div>
  )
}
