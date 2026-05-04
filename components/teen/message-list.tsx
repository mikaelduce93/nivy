"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Conversation {
  id: string
  otherUser: {
    id: string
    name: string
    avatar?: string
    isOnline?: boolean
  }
  lastMessage?: {
    content: string
    timestamp: string
    isRead: boolean
  }
  unreadCount: number
}

interface MessageListProps {
  conversations: Conversation[]
  selectedId?: string
  onSelect: (id: string) => void
}

export function MessageList({ conversations, selectedId, onSelect }: MessageListProps) {
  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-zinc-500">
        <p>Aucune conversation</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-zinc-800">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={cn(
            "w-full p-4 flex items-center gap-3 hover:bg-zinc-800/50 transition-colors text-left",
            selectedId === conv.id && "bg-zinc-800"
          )}
        >
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={conv.otherUser.avatar} />
              <AvatarFallback className="bg-pink-500/20 text-pink-400">
                {conv.otherUser.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {conv.otherUser.isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-zinc-900" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-white truncate">
                {conv.otherUser.name}
              </span>
              {conv.lastMessage && (
                <span className="text-xs text-zinc-500 flex-shrink-0">
                  {new Date(conv.lastMessage.timestamp).toLocaleDateString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit"
                  })}
                </span>
              )}
            </div>
            {conv.lastMessage && (
              <p className={cn(
                "text-sm truncate",
                conv.lastMessage.isRead ? "text-zinc-500" : "text-zinc-300 font-medium"
              )}>
                {conv.lastMessage.content}
              </p>
            )}
          </div>
          {conv.unreadCount > 0 && (
            <span className="bg-pink-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {conv.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
