"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle, Search, Send, Phone, Video, MoreVertical, Check, CheckCheck, Image, Smile, Paperclip, Users, Plus, ArrowLeft } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Static conversations data
const CONVERSATIONS = [
  { 
    id: 1, 
    name: "Salma K.", 
    avatar: null, 
    lastMessage: "C'est trop cool le nouveau quiz!", 
    time: "Il y a 2m", 
    unread: 3, 
    online: true,
    typing: false
  },
  { 
    id: 2, 
    name: "Omar B.", 
    avatar: null, 
    lastMessage: "On se voit à l'event?", 
    time: "Il y a 15m", 
    unread: 0, 
    online: true,
    typing: true
  },
  { 
    id: 3, 
    name: "Nadia L.", 
    avatar: null, 
    lastMessage: "GG pour le quiz! 🎉", 
    time: "Il y a 1h", 
    unread: 1, 
    online: false,
    typing: false
  },
  { 
    id: 4, 
    name: "Crew: Alpha Squad", 
    avatar: null, 
    lastMessage: "Youssef: Let's gooo!", 
    time: "Il y a 2h", 
    unread: 12, 
    online: true,
    isGroup: true,
    members: 6
  },
  { 
    id: 5, 
    name: "Youssef M.", 
    avatar: null, 
    lastMessage: "Tu as vu le nouveau défi?", 
    time: "Hier", 
    unread: 0, 
    online: false,
    typing: false
  },
  { 
    id: 6, 
    name: "Amina R.", 
    avatar: null, 
    lastMessage: "Merci pour l'aide!", 
    time: "Hier", 
    unread: 0, 
    online: false,
    typing: false
  },
]

const SAMPLE_MESSAGES = [
  { id: 1, sender: "them", text: "Hey! Tu as fait le quiz de math?", time: "14:30" },
  { id: 2, sender: "me", text: "Oui! J'ai eu 95% 🎉", time: "14:32", read: true },
  { id: 3, sender: "them", text: "Trop fort! Moi j'ai eu 80%", time: "14:33" },
  { id: 4, sender: "them", text: "Tu peux m'aider pour le prochain?", time: "14:33" },
  { id: 5, sender: "me", text: "Bien sûr! On se fait un quiz ensemble?", time: "14:35", read: true },
  { id: 6, sender: "them", text: "C'est trop cool le nouveau quiz!", time: "14:36" },
]

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [messageInput, setMessageInput] = useState("")

  const filteredConversations = CONVERSATIONS.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalUnread = CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0)

  const selectedConvo = CONVERSATIONS.find(c => c.id === selectedConversation)

  return (
    <div className="min-h-screen pb-32">
      {/* Mobile: Show either list or chat */}
      <div className="md:hidden">
        {selectedConversation === null ? (
          <ConversationList
            conversations={filteredConversations}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            totalUnread={totalUnread}
            onSelect={setSelectedConversation}
          />
        ) : (
          <ChatView
            conversation={selectedConvo!}
            messages={SAMPLE_MESSAGES}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            onBack={() => setSelectedConversation(null)}
          />
        )}
      </div>

      {/* Desktop: Side by side */}
      <div className="hidden md:grid md:grid-cols-[380px,1fr] gap-6 pt-6">
        <ConversationList
          conversations={filteredConversations}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalUnread={totalUnread}
          onSelect={setSelectedConversation}
          selectedId={selectedConversation}
        />
        {selectedConversation !== null && selectedConvo ? (
          <ChatView
            conversation={selectedConvo}
            messages={SAMPLE_MESSAGES}
            messageInput={messageInput}
            setMessageInput={setMessageInput}
            isDesktop
          />
        ) : (
          <div className="flex items-center justify-center h-[600px] rounded-3xl bg-zinc-900/50 border border-white/5">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Sélectionne une conversation</h3>
              <p className="text-zinc-500">Choisis une conversation pour commencer</p>
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
  selectedId 
}: any) {
  return (
    <div className="space-y-6 pt-6 md:pt-0">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gen-z-sky to-blue-500 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-black" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tighter uppercase italic">Messages</h1>
              <p className="text-zinc-500 text-sm font-medium">{totalUnread} non lus</p>
            </div>
          </div>
          <Button size="icon" className="rounded-full bg-gen-z-sky text-black">
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher..."
            className="pl-12 h-12 rounded-xl bg-zinc-900/50 border-white/10"
          />
        </div>
      </header>

      {/* Conversations */}
      <div className="space-y-2">
        {conversations.map((convo: any, idx: number) => (
          <motion.div
            key={convo.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => onSelect(convo.id)}
            className={cn(
              "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all",
              selectedId === convo.id
                ? "bg-gen-z-sky/10 border border-gen-z-sky/30"
                : "bg-zinc-900/50 border border-white/5 hover:border-white/10"
            )}
          >
            {/* Avatar */}
            <div className="relative">
              {convo.isGroup ? (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-coral to-pink-500 flex items-center justify-center">
                  <Users className="w-7 h-7 text-white" />
                </div>
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-xl font-bold text-white">
                  {convo.name.charAt(0)}
                </div>
              )}
              {convo.online && !convo.isGroup && (
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-green-500 border-2 border-zinc-900" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-bold text-white truncate">{convo.name}</h4>
                {convo.isGroup && (
                  <span className="text-xs text-zinc-500">{convo.members} membres</span>
                )}
              </div>
              <p className={cn(
                "text-sm truncate",
                convo.unread > 0 ? "text-white font-medium" : "text-zinc-400"
              )}>
                {convo.typing ? (
                  <span className="text-gen-z-mint italic">écrit...</span>
                ) : (
                  convo.lastMessage
                )}
              </p>
            </div>

            {/* Meta */}
            <div className="text-right shrink-0">
              <span className="text-xs text-zinc-500">{convo.time}</span>
              {convo.unread > 0 && (
                <div className="mt-1 w-6 h-6 rounded-full bg-gen-z-sky text-black text-xs font-black flex items-center justify-center ml-auto">
                  {convo.unread}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function ChatView({ 
  conversation, 
  messages, 
  messageInput, 
  setMessageInput, 
  onBack,
  isDesktop 
}: any) {
  return (
    <div className={cn(
      "flex flex-col",
      isDesktop ? "h-[600px] rounded-3xl bg-zinc-900/50 border border-white/5" : "min-h-screen"
    )}>
      {/* Chat Header */}
      <div className={cn(
        "flex items-center gap-4 p-4 border-b border-white/5",
        !isDesktop && "pt-6"
      )}>
        {!isDesktop && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gen-z-lavender to-gen-z-sky flex items-center justify-center text-lg font-bold text-white">
            {conversation.name.charAt(0)}
          </div>
          {conversation.online && (
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-zinc-900" />
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-white">{conversation.name}</h4>
          <p className="text-sm text-zinc-400">
            {conversation.typing ? "écrit..." : conversation.online ? "En ligne" : "Hors ligne"}
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
        {messages.map((msg: any) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex",
              msg.sender === "me" ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[70%] p-4 rounded-2xl",
              msg.sender === "me"
                ? "bg-gen-z-sky text-black rounded-br-md"
                : "bg-zinc-800 text-white rounded-bl-md"
            )}>
              <p>{msg.text}</p>
              <div className={cn(
                "flex items-center gap-1 mt-1",
                msg.sender === "me" ? "justify-end" : "justify-start"
              )}>
                <span className={cn(
                  "text-xs",
                  msg.sender === "me" ? "text-black/60" : "text-zinc-500"
                )}>
                  {msg.time}
                </span>
                {msg.sender === "me" && (
                  <CheckCheck className={cn(
                    "w-4 h-4",
                    msg.read ? "text-black" : "text-black/40"
                  )} />
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Image className="w-5 h-5" />
          </Button>
          <Input
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Écrire un message..."
            className="flex-1 h-12 rounded-xl bg-zinc-800 border-0"
          />
          <Button variant="ghost" size="icon" className="shrink-0 rounded-full">
            <Smile className="w-5 h-5" />
          </Button>
          <Button size="icon" className="shrink-0 rounded-full bg-gen-z-sky text-black">
            <Send className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
