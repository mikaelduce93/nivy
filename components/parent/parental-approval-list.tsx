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
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-zinc-500 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
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

  const handleApprove = () => {
    setIsApproving(true)
    setTimeout(() => {
      toast.success("Demande approuvée et payée !")
      onAction(request.id)
    }, 1000)
  }

  const handleReject = () => {
    toast.error("Demande refusée")
    onAction(request.id)
  }

  const isBirthday = request.approval_type === 'purchase' && request.request_data?.type === 'birthday'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative overflow-hidden rounded-3xl"
    >
      <motion.div style={{ background }} className="absolute inset-0 z-0" />
      
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className="relative z-10 bg-zinc-900 border border-white/5 p-5 cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center shadow-xl",
              isBirthday ? "bg-gen-z-lavender/20 text-gen-z-lavender" : "bg-gen-z-teal/20 text-gen-z-teal"
            )}>
              {isBirthday ? <Cake className="w-7 h-7" /> : <Ticket className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-white uppercase tracking-tight">
                  {isBirthday ? "Fête d'Anniversaire" : "Réservation Événement"}
                </h4>
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[8px] font-black text-zinc-500 uppercase">
                  de {request.teen_name || "ton enfant"}
                </span>
              </div>
              <p className="text-zinc-400 text-sm font-medium">
                {isBirthday 
                  ? `${request.request_data?.price} DH • ${request.request_data?.guests} invités` 
                  : `${request.request_data?.event_name || 'Événement'}`
                }
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <p className="text-lg font-black text-white">{request.request_data?.price || 0} DH</p>
            <div className="flex items-center gap-1 text-[10px] font-black text-zinc-500">
              <span>SLIDE TO APPROVE</span>
              <ChevronRight className="w-3 h-3 animate-bounce-x" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Visual Cues for drag */}
      <motion.div style={{ opacity }} className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
        <X className="w-8 h-8 text-red-500" />
      </motion.div>
      <motion.div style={{ opacity }} className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
        <Check className="w-8 h-8 text-green-500" />
      </motion.div>
    </motion.div>
  )
}
