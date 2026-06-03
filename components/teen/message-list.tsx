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
      <div className="p-4 text-center text-mute">
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
            "w-full p-4 flex items-center gap-3 hover:bg-card transition-colors text-left",
            selectedId === conv.id && "bg-card"
          )}
        >
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={conv.otherUser.avatar} />
              <AvatarFallback className="bg-pink/20 text-pink">
                {conv.otherUser.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {conv.otherUser.isOnline && (
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-lime border-2 border-ink" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-ink truncate">
                {conv.otherUser.name}
              </span>
              {conv.lastMessage && (
                <span className="text-xs text-mute flex-shrink-0">
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
                conv.lastMessage.isRead ? "text-mute" : "text-ink-2 font-medium"
              )}>
                {conv.lastMessage.content}
              </p>
            )}
          </div>
          {conv.unreadCount > 0 && (
            <span className="bg-pink text-ink text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
              {conv.unreadCount}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
