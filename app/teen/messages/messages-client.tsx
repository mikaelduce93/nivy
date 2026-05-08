"use client"

/**
 * Teen direct messages — list + thread view.
 *
 * Wave 2 / TICKET-002 — design-system token sweep:
 *  - Surface backgrounds switched from raw zinc-9xx → semantic tokens
 *    (card/30, muted, border).
 *  - Body copy text-zinc-* → text-muted-foreground (per role).
 *  - Headings still use the teen 4xl/black/italic pattern.
 *  - Buttons + Input continue to be routed through their primitives.
 */

import { useState } from "react"
import { motion } from "framer-motion"
import {
  MessageCircle,
  Search,
  Send,
  Phone,
  Video,
  MoreVertical,
  CheckCheck,
  Image as ImageIcon,
  Smile,
  Paperclip,
  Users,
  Plus,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/ui/states/empty-state"
import { H1 } from "@/components/ui/headings"

interface Conversation {
  id: string
  name: string
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  isGroup: boolean
  participantIds: string[]
  otherParticipantName: string | null
  otherParticipantId: string | null
}

interface Message {
  id: string
  sender: "me" | "them"
  text: string
  time: string
  read?: boolean
}

interface MessagesClientProps {
  conversations: Conversation[]
  currentUserId: string
}

function formatTime(isoString: string | null): string {
  if (!isoString) return ""
  const date = new Date(isoString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin}m`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `Il y a ${diffH}h`
  return "Hier"
}

export function MessagesClient({ conversations, currentUserId }: MessagesClientProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

  const filtered = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)
  const selectedConvo = conversations.find((c) => c.id === selectedId)

  async function openConversation(id: string) {
    setSelectedId(id)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/teen/messages?conversationId=${id}`)
      if (res.ok) {
        const json = await res.json()
        const msgs: Message[] = (json.data || []).map((m: any) => ({
          id: m.id as string,
          sender: m.sender_id === currentUserId ? "me" : "them",
          text: m.content as string,
          time: new Date(m.created_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          read: m.is_read,
        }))
        setMessages(msgs)
      }
    } catch {
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !selectedId) return
    const content = messageInput.trim()
    setMessageInput("")

    // Optimistic UI
    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      sender: "me",
      text: content,
      time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      read: false,
    }
    setMessages((prev) => [...prev, tempMsg])

    try {
      await fetch("/api/teen/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          senderId: currentUserId,
          content,
        }),
      })
    } catch {
      // silent — optimistic message already shown
    }
  }

  return (
    <div className="min-h-screen pb-32">
      {/* Mobile: Show either list or chat */}
      <div className="md:hidden">
        {selectedId === null ? (
          <ConversationList
            conversations={filtered}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalUnread={totalUnread}
            onSelect={openConversation}
          />
        ) : (
          <ChatView
            conversation={selectedConvo!}
            messages={messages}
            loading={loadingMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            onSend={sendMessage}
            onBack={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden md:grid md:grid-cols-[380px,1fr] gap-6 pt-6">
        <ConversationList
          conversations={filtered}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalUnread={totalUnread}
          onSelect={openConversation}
          selectedId={selectedId}
        />
        {selectedId !== null && selectedConvo ? (
          <ChatView
            conversation={selectedConvo}
            messages={messages}
            loading={loadingMessages}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            onSend={sendMessage}
            isDesktop
          />
        ) : (
          <div className="flex items-center justify-center h-[600px] rounded-3xl bg-card/30 border border-border backdrop-blur-md">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-muted-foreground/60 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Sélectionne une conversation</h3>
              <p className="text-muted-foreground">Choisis une conversation pour commencer</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function ConversationList({
  conversations,
  searchQuery,
  setSearchQuery,
  totalUnread,
  onSelect,
  selectedId,
}: {
  conversations: Conversation[]
  searchQuery: string
  setSearchQuery: (v: string) => void
  totalUnread: number
  onSelect: (id: string) => void
  selectedId?: string | null
}) {
  return (
    <div className="space-y-6 pt-6 md:pt-0">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-info-soft to-blue-500 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-black" />
            </div>
            <div>
              <H1 className="text-4xl font-black tracking-tighter uppercase italic leading-none">
                Messages
              </H1>
              <p className="text-muted-foreground text-sm font-medium">
                {totalUnread > 0 ? `${totalUnread} non lus` : "Tous lus"}
              </p>
            </div>
          </div>
          <Button size="icon" className="rounded-full bg-info-soft text-black">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-12 h-12 rounded-xl bg-card/40 border-border"
          />
        </div>
      </header>

      {conversations.length === 0 ? (
        <EmptyState
          preset="messages"
          size="default"
          action={{ label: "Trouver des amis", href: "/teen/friends" }}
        />
      ) : (
        <div className="space-y-2">
          {conversations.map((convo, idx) => (
            <motion.div
              key={convo.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelect(convo.id)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all",
                selectedId === convo.id
                  ? "bg-info-soft/10 border border-info-soft/30"
                  : "bg-card/30 border border-border hover:border-border/80 backdrop-blur-md"
              )}
            >
              <div className="relative">
                {convo.isGroup ? (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent-soft to-brand-soft flex items-center justify-center">
                    <Users className="w-7 h-7 text-primary-foreground" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-xl font-bold text-primary-foreground">
                    {convo.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-foreground truncate">{convo.name}</h4>
                </div>
                <p className={cn(
                  "text-sm truncate",
                  convo.unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                )}>
                  {convo.lastMessage ?? "Nouvelle conversation"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs text-muted-foreground">{formatTime(convo.lastMessageAt)}</span>
                {convo.unreadCount > 0 && (
                  <div className="mt-1 w-6 h-6 rounded-full bg-info-soft text-black text-xs font-black flex items-center justify-center ml-auto">
                    {convo.unreadCount}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

function ChatView({
  conversation,
  messages,
  loading,
  messageInput,
  setMessageInput,
  onSend,
  onBack,
  isDesktop,
}: {
  conversation: Conversation
  messages: Message[]
  loading: boolean
  messageInput: string
  setMessageInput: (v: string) => void
  onSend: () => void
  onBack?: () => void
  isDesktop?: boolean
}) {
  return (
    <div className={cn(
      "flex flex-col",
      isDesktop ? "h-[600px] rounded-3xl bg-card/30 border border-border backdrop-blur-md" : "min-h-screen"
    )}>
      {/* Chat Header */}
      <div className={cn("flex items-center gap-4 p-4 border-b border-border", !isDesktop && "pt-6")}>
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-soft to-info-soft flex items-center justify-center text-lg font-bold text-primary-foreground">
            {conversation.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-foreground">{conversation.name}</h4>
          <p className="text-sm text-muted-foreground">
            {conversation.isGroup ? `${conversation.participantIds.length} membres` : "Conversation privée"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Phone className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Video className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <MoreVertical className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center text-muted-foreground py-8">Chargement...</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <MessageCircle className="w-12 h-12 text-muted-foreground/60 mx-auto mb-3" />
            <p>Aucun message. Dis bonjour !</p>
          </div>
        )}
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}
          >
            <div className={cn(
              "max-w-[70%] p-4 rounded-2xl",
              msg.sender === "me"
                ? "bg-info-soft text-black rounded-br-md"
                : "bg-muted text-foreground rounded-bl-md"
            )}>
              <p>{msg.text}</p>
              <div className={cn(
                "flex items-center gap-1 mt-1",
                msg.sender === "me" ? "justify-end" : "justify-start"
              )}>
                <span className={cn("text-xs", msg.sender === "me" ? "text-black/60" : "text-muted-foreground")}>
                  {msg.time}
                </span>
                {msg.sender === "me" && (
                  <CheckCheck className={cn("w-4 h-4", msg.read ? "text-black" : "text-black/40")} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <ImageIcon className="w-5 h-5" />
          </Button>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Écrire un message..."
            className="flex-1 h-12 rounded-xl bg-muted border-0"
          />
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Smile className="w-5 h-5" />
          </Button>
          <Button
            size="icon"
            className="shrink-0 rounded-full bg-info-soft text-black"
            onClick={onSend}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
