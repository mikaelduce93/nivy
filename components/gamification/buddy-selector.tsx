
'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Check, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { inviteBuddyForQuest } from '@/gamification-system/features/crews/actions-social'

interface Buddy {
  id: string
  name: string
  avatar: string
  status: 'online' | 'offline'
}

// Mock friends list
const MOCK_FRIENDS: Buddy[] = [
  { id: '1', name: 'Karim', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Karim', status: 'online' },
  { id: '2', name: 'Sofia', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sofia', status: 'offline' },
  { id: '3', name: 'Youssef', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Youssef', status: 'online' },
]

export function BuddySelector({ questId }: { questId: string }) {
  const [invited, setInvited] = useState<string[]>([])
  const [isOpen, setIsOpen] = useState(false)

  const handleInvite = async (friendId: string) => {
    try {
      await inviteBuddyForQuest(friendId, questId)
      setInvited([...invited, friendId])
    } catch (error) {
      console.error('Failed to invite buddy', error)
    }
  }

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
      >
        <User className="w-3 h-3" />
        Inviter un Duo
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 w-64 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-50 p-2"
          >
            <div className="text-xs font-medium text-zinc-500 px-2 py-1 mb-1">Amis disponibles</div>
            <div className="space-y-1">
              {MOCK_FRIENDS.map(friend => (
                <div key={friend.id} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Image src={friend.avatar} alt={friend.name} width={24} height={24} className="w-6 h-6 rounded-full bg-zinc-800" />
                    <span className="text-sm text-zinc-200">{friend.name}</span>
                  </div>
                  <button
                    onClick={() => handleInvite(friend.id)}
                    disabled={invited.includes(friend.id)}
                    className={cn(
                      "w-6 h-6 flex items-center justify-center rounded-full transition-colors",
                      invited.includes(friend.id) 
                        ? "bg-green-500/20 text-green-400" 
                        : "bg-white/10 text-white hover:bg-white/20"
                    )}
                  >
                    {invited.includes(friend.id) ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}



