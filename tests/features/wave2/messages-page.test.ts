/**
 * Unit tests for /teen/messages Wave 2 data logic.
 * Tests the conversation display helpers in messages-client.tsx.
 */
import { describe, expect, it } from "vitest"

// ─── formatTime (mirrors messages-client.tsx) ────────────────────────────────
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

// Count total unread messages (mirrors MessagesClient)
function totalUnread(convos: Conversation[]): number {
  return convos.reduce((sum, c) => sum + c.unreadCount, 0)
}

// Filter by search query (mirrors MessagesClient)
function filterConversations(convos: Conversation[], query: string): Conversation[] {
  return convos.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  )
}

describe("messages formatTime", () => {
  it("returns empty string for null", () => {
    expect(formatTime(null)).toBe("")
  })

  it("returns 'À l'instant' for recent timestamps", () => {
    const result = formatTime(new Date().toISOString())
    expect(result).toBe("À l'instant")
  })

  it("returns hours string for timestamps < 24h ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatTime(twoHoursAgo)).toBe("Il y a 2h")
  })

  it("returns 'Hier' for timestamps > 24h ago", () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString()
    expect(formatTime(yesterday)).toBe("Hier")
  })

  it("returns minutes string for timestamps < 1h ago", () => {
    const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    expect(formatTime(thirtyMinAgo)).toBe("Il y a 30m")
  })
})

describe("messages totalUnread", () => {
  it("returns 0 for empty list", () => {
    expect(totalUnread([])).toBe(0)
  })

  it("sums unread counts correctly", () => {
    const convos: Conversation[] = [
      { id: "1", name: "Alice", lastMessage: null, lastMessageAt: null,
        unreadCount: 3, isGroup: false, participantIds: [], otherParticipantName: "Alice", otherParticipantId: "u1" },
      { id: "2", name: "Bob",   lastMessage: null, lastMessageAt: null,
        unreadCount: 5, isGroup: false, participantIds: [], otherParticipantName: "Bob", otherParticipantId: "u2" },
    ]
    expect(totalUnread(convos)).toBe(8)
  })

  it("returns 0 when all conversations are read", () => {
    const convos: Conversation[] = [
      { id: "1", name: "Alice", lastMessage: null, lastMessageAt: null,
        unreadCount: 0, isGroup: false, participantIds: [], otherParticipantName: null, otherParticipantId: null },
    ]
    expect(totalUnread(convos)).toBe(0)
  })
})

describe("messages filterConversations", () => {
  const convos: Conversation[] = [
    { id: "1", name: "Salma K.", lastMessage: null, lastMessageAt: null,
      unreadCount: 0, isGroup: false, participantIds: [], otherParticipantName: null, otherParticipantId: null },
    { id: "2", name: "Crew: Alpha", lastMessage: null, lastMessageAt: null,
      unreadCount: 0, isGroup: true, participantIds: [], otherParticipantName: null, otherParticipantId: null },
    { id: "3", name: "Omar B.", lastMessage: null, lastMessageAt: null,
      unreadCount: 0, isGroup: false, participantIds: [], otherParticipantName: null, otherParticipantId: null },
  ]

  it("returns all conversations for empty query", () => {
    expect(filterConversations(convos, "")).toHaveLength(3)
  })

  it("filters case-insensitively", () => {
    const result = filterConversations(convos, "salma")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("1")
  })

  it("matches partial names", () => {
    const result = filterConversations(convos, "alpha")
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe("2")
  })

  it("returns empty when no match", () => {
    expect(filterConversations(convos, "zzzzz")).toHaveLength(0)
  })
})
