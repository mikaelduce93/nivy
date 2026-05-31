'use client'

import { useState } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { Check, X, Cake, Ticket, CreditCard, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ApprovalRequest {
  id: string
  teen_name: string
  type: 'birthday' | 'event' | 'purchase'
  data: any
  created_at: string
}

export function ParentalApprovalList({ requests }: { requests: any[] }) {
  const [items, setItems] = useState(requests)

  if (items.length === 0) return null

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-mute flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
        Action Required
      </h3>
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((req) => (
            <ApprovalItem 
              key={req.id} 
              request={req} 
              onAction={(id) => setItems(items.filter(i => i.id !== id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ApprovalItem({ request, onAction }: { request: any, onAction: (id: string) => void }) {
  const [isApproving, setIsApproving] = useState(false)
  const x = useMotionValue(0)
  const background = useTransform(
    x,
    [-100, 0, 100],
    ["rgba(239, 68, 68, 0.2)", "rgba(255, 255, 255, 0.05)", "rgba(34, 197, 94, 0.2)"]
  )
  const opacity = useTransform(x, [-100, -50, 0, 50, 100], [1, 0.5, 0, 0.5, 1])

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x > 100) {
      handleApprove()
    } else if (info.offset.x < -100) {
      handleReject()
    }
  }

  // Real decision call. The approval is only removed from the list on a 2xx
  // response — a failed POST keeps the card and surfaces an honest error
  // instead of the previous fake "approuvée et payée" success.
  const decide = async (decision: 'approve' | 'deny') => {
    if (isApproving) return
    setIsApproving(true)
    try {
      const res = await fetch('/api/parent/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId: request.id, decision }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'request_failed')
      }
      toast.success(decision === 'approve' ? 'Demande approuvée' : 'Demande refusée')
      onAction(request.id)
    } catch {
      toast.error("Action impossible pour le moment. Réessaie dans un instant.")
      setIsApproving(false)
    }
  }

  const handleApprove = () => decide('approve')
  const handleReject = () => decide('deny')

  const ACTION_LABELS: Record<string, string> = {
    food_order: 'Commande repas',
    ride: 'Trajet',
    coach_meeting: 'Séance mentor',
    purchase_above_ceiling: 'Achat',
    content: 'Contenu',
    booking: 'Réservation événement',
  }
  const isBirthday = request.details?.type === 'birthday'
  const actionLabel = isBirthday
    ? "Fête d'anniversaire"
    : ACTION_LABELS[request.action_type as string] ?? 'Demande'
  const detailText = isBirthday
    ? `${request.details?.guests ?? request.details?.guest_count ?? '?'} invités`
    : request.details?.event_name || request.details?.reason || actionLabel

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative overflow-hidden rounded-2xl"
    >
      <motion.div style={{ background }} className="absolute inset-0 z-0" />
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-card border border-ink p-5 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl",
              isBirthday ? "bg-brand-soft/20 text-brand-soft" : "bg-teal/20 text-teal"
            )}>
              {isBirthday ? <Cake className="w-7 h-7" /> : <Ticket className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-ink uppercase tracking-tight">
                  {actionLabel}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-paper-2 text-[8px] font-black text-mute uppercase">
                  de {request.teen_name || "ton enfant"}
                </span>
              </div>
              <p className="text-mute text-sm font-medium">
                {detailText}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <p className="text-lg font-black text-ink">{request.amount || 0} DH</p>
            <div className="flex items-center gap-1 text-[10px] font-black text-mute">
              <span>SLIDE TO APPROVE</span>
              <ChevronRight className="w-3 h-3 animate-bounce-x" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Cues for drag */}
      <motion.div style={{ opacity }} className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <X className="w-8 h-8 text-destructive" />
      </motion.div>
      <motion.div style={{ opacity }} className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
        <Check className="w-8 h-8 text-lime" />
      </motion.div>
    </motion.div>
  )
}
