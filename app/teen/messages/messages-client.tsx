"use client"

/**
 * Teen direct messages — list + thread view.
 *
 * Refonte #154 — charte paper néo-brutaliste :
 *  - Hero éditorial (eyebrow mono + titre Bricolage + Niv) au lieu du carré-
 *    icône gradient.
 *  - Bulles « moi » = surface sombre ponctuelle ; « autre » = sticker blanc.
 *  - Rows conversation en StickerCard hover-lift ; empty desktop avec Niv.
 *  - Boutons décoratifs sans action (Phone/Video/MoreVertical/Paperclip/
 *    ImageIcon/Smile/Plus) retirés. Realtime `dm:{id}` inchangé.
 */

import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
import {
  MessageCircle,
  Search,
  Send,
  CheckCheck,
  ArrowLeft,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StickerCard } from "@/components/ui/sticker-card"
import { Niv, DarkSurface, NivEmpty } from "@/components/brand"
import { EmptyState } from "@/components/ui/states/empty-state"

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
  attachment_path?: string | null
  attachment_signed_url?: string | null
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

  // Wave 2A canonical realtime channel — `dm:{conversationId}`.
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>["channel"]> | null>(null)

  function teardownChannel() {
    if (channelRef.current) {
      const supabase = createBrowserClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
  }

  useEffect(() => {
    return () => teardownChannel()
  }, [])

  function mapServerMessage(m: any): Message {
    return {
      id: m.id as string,
      sender: m.sender_id === currentUserId ? "me" : "them",
      text: (m.content ?? "") as string,
      time: new Date(m.created_at).toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: m.is_read,
      attachment_path: m.attachment_path ?? null,
    }
  }

  async function openConversation(id: string) {
    teardownChannel()
    setSelectedId(id)
    setLoadingMessages(true)
    try {
      const res = await fetch(`/api/teen/messages?conversationId=${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const msgs: Message[] = (json.data || []).map(mapServerMessage)
      setMessages(msgs)

      // Subscribe to realtime INSERTs for this conversation.
      const supabase = createBrowserClient()
      const ch = supabase
        .channel(`dm:${id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "direct_messages",
            filter: `conversation_id=eq.${id}`,
          },
          (payload: any) => {
            const incoming = mapServerMessage(payload.new)
            setMessages((prev) => {
              if (prev.some((m) => m.id === incoming.id)) return prev
              return [...prev, incoming]
            })
          }
        )
        .subscribe()
      channelRef.current = ch
    } catch {
      setMessages([])
      toast.error("Impossible d'ouvrir la conversation")
    } finally {
      setLoadingMessages(false)
    }
  }

  async function sendMessage() {
    if (!messageInput.trim() || !selectedId) return
    const content = messageInput.trim()
    setMessageInput("")

    // Optimistic UI with tempId — reconciled against server response.
    const tempId = `temp-${Date.now()}`
    const tempMsg: Message = {
      id: tempId,
      sender: "me",
      text: content,
      time: new Date().toLocaleTimeString("fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      read: false,
    }
    setMessages((prev) => [...prev, tempMsg])

    let res: Response
    try {
      res = await fetch("/api/teen/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          senderId: currentUserId,
          content,
        }),
      })
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(content)
      toast.error("Message non envoyé, réessaie")
      return
    }

    if (!res.ok) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(content)
      const status = res.status
      if (status === 403) toast.error("Tu ne peux pas envoyer de message à cette personne")
      else toast.error("Message non envoyé, réessaie")
      return
    }

    try {
      const json = await res.json()
      const real = json?.data
      if (real) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...mapServerMessage(real), sender: "me" } : m
          )
        )
      }
    } catch {
      // server returned non-JSON; leave optimistic in place.
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
          <div className="flex items-center justify-center h-[600px] rounded-2xl border-2 border-ink bg-white shadow-stkr-md">
            <NivEmpty
              title="Sélectionne une conversation"
              description="Choisis une conversation pour commencer."
            />
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
        <div className="flex items-center gap-4">
          <Niv mood="happy" size={64} />
          <div>
            <p className="eyebrow tracking-[0.16em]">Tes DM</p>
            <h1 className="font-display text-4xl font-extrabold tracking-tight leading-none">
              Messages
            </h1>
            <p className="text-sm text-mute">
              {totalUnread > 0 ? `${totalUnread} non lus` : "Tous lus"}
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-mute" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher…"
            className="pl-12 h-12 rounded-xl border-2 border-ink"
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
          {conversations.map((convo) => (
            <StickerCard
              key={convo.id}
              variant="hover"
              onClick={() => onSelect(convo.id)}
              className={cn(
                "flex-row items-center gap-4 p-4",
                selectedId === convo.id && "bg-pink"
              )}
            >
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-2 border-ink bg-paper flex items-center justify-center text-xl font-bold text-ink">
                  {convo.isGroup ? (
                    <MessageCircle className="w-7 h-7 text-ink" />
                  ) : (
                    convo.name.charAt(0).toUpperCase()
                  )}
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold text-ink truncate">{convo.name}</h4>
                </div>
                <p className={cn(
                  "text-sm truncate",
                  convo.unreadCount > 0 ? "text-ink font-medium" : "text-mute"
                )}>
                  {convo.lastMessage ?? "Nouvelle conversation"}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-xs text-mute">{formatTime(convo.lastMessageAt)}</span>
                {convo.unreadCount > 0 && (
                  <div className="mt-1 w-6 h-6 rounded-full border-2 border-ink bg-pink text-ink text-xs font-extrabold flex items-center justify-center ml-auto">
                    {convo.unreadCount}
                  </div>
                )}
              </div>
            </StickerCard>
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
      isDesktop ? "h-[600px] rounded-2xl border-2 border-ink bg-white shadow-stkr-md overflow-hidden" : "min-h-screen"
    )}>
      {/* Chat Header */}
      <div className={cn("flex items-center gap-4 p-4 border-b-2 border-ink", !isDesktop && "pt-6")}>
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-ink bg-paper flex items-center justify-center text-lg font-bold text-ink">
            {conversation.name.charAt(0).toUpperCase()}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-ink">{conversation.name}</h4>
          <p className="text-sm text-mute">
            {conversation.isGroup ? `${conversation.participantIds.length} membres` : "Conversation privée"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="text-center text-mute py-8">Chargement…</div>
        )}
        {!loading && messages.length === 0 && (
          <div className="flex h-full items-center justify-center py-8">
            <NivEmpty
              mood="happy"
              title="Dis salam à ton pote"
              description="Aucun message. Lance la discussion !"
            />
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn("flex", msg.sender === "me" ? "justify-end" : "justify-start")}
          >
            {msg.sender === "me" ? (
              <DarkSurface tone="pink" className="max-w-[70%] px-4 py-2.5 rounded-br-md">
                <p className="text-paper">{msg.text}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <span className="font-mono text-[10px] text-paper/60">{msg.time}</span>
                  <CheckCheck className={cn("w-4 h-4", msg.read ? "text-paper" : "text-paper/40")} />
                </div>
              </DarkSurface>
            ) : (
              <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-bl-md border-2 border-ink bg-white text-ink">
                <p>{msg.text}</p>
                <div className="flex items-center justify-start gap-1 mt-1">
                  <span className="font-mono text-[10px] text-mute">{msg.time}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t-2 border-ink">
        <div className="flex items-center gap-3">
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSend()}
            placeholder="Écrire un message…"
            className="flex-1 h-12 rounded-xl border-2 border-ink"
          />
          <Button
            variant="pink"
            size="icon"
            className="shrink-0"
            onClick={onSend}
          >
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
