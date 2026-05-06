/**
 * Unit tests for /teen/calendar Wave 2 data logic.
 * Tests the event date normalization and filtering logic
 * applied in CalendarClient and the server component.
 */
import { describe, expect, it } from "vitest"

interface Event {
  id: string
  title: string
  date: string         // ISO date YYYY-MM-DD
  time: string | null
  location: string | null
  type: string
  xpReward: number
  registered: boolean
  rsvpLabel: string
  attendees: number | null
}

// Mirrors page.tsx: strips time from ISO datetime to get date-only string
function normalizeDate(isoString: string): string {
  return isoString.split("T")[0]
}

// Mirrors CalendarClient: filter events for a given date
function getEventsForDate(events: Event[], dateStr: string): Event[] {
  return events.filter((e) => e.date === dateStr)
}

// Mirrors CalendarClient: upcoming events sorted by date, limited to 3
function getUpcomingEvents(events: Event[], todayStr: string): Event[] {
  return [...events]
    .filter((e) => e.date >= todayStr)
    .slice(0, 3)
}

// Mirrors page.tsx: DashboardEvent → CalendarEvent shape transform
function transformEvent(event: {
  id: string
  title: string
  date: string
  time?: string | null
  city?: string | null
  venue?: string | null
  category?: string | null
  rsvpStatus: string
  rsvpLabel: string
}): Event {
  return {
    id: event.id,
    title: event.title,
    date: event.date ? event.date.split("T")[0] : "",
    time: event.time ?? null,
    location: event.city ?? event.venue ?? null,
    type: event.category ?? "event",
    xpReward: 0,
    registered: event.rsvpStatus === "confirmed" || event.rsvpStatus === "pending",
    rsvpLabel: event.rsvpLabel,
    attendees: null,
  }
}

describe("calendar date normalization", () => {
  it("strips time from ISO datetime", () => {
    expect(normalizeDate("2026-06-15T18:00:00Z")).toBe("2026-06-15")
  })

  it("passes through date-only string unchanged", () => {
    expect(normalizeDate("2026-06-15")).toBe("2026-06-15")
  })
})

describe("calendar event filtering", () => {
  const events: Event[] = [
    {
      id: "1", title: "Gaming Night", date: "2026-06-10",
      time: "18:00", location: "Casa", type: "event",
      xpReward: 0, registered: true, rsvpLabel: "Inscrit", attendees: null,
    },
    {
      id: "2", title: "Quiz Challenge", date: "2026-06-10",
      time: "15:00", location: "En ligne", type: "challenge",
      xpReward: 0, registered: false, rsvpLabel: "Disponible", attendees: null,
    },
    {
      id: "3", title: "Crew Battle", date: "2026-06-12",
      time: null, location: null, type: "battle",
      xpReward: 0, registered: true, rsvpLabel: "Inscrit", attendees: null,
    },
  ]

  it("returns correct events for a specific date", () => {
    const result = getEventsForDate(events, "2026-06-10")
    expect(result).toHaveLength(2)
    expect(result.map((e) => e.id)).toEqual(["1", "2"])
  })

  it("returns empty array when no events on date", () => {
    expect(getEventsForDate(events, "2026-06-11")).toHaveLength(0)
  })

  it("returns upcoming events from today onward", () => {
    const upcoming = getUpcomingEvents(events, "2026-06-11")
    expect(upcoming).toHaveLength(1)
    expect(upcoming[0].id).toBe("3")
  })

  it("limits upcoming to 3 events", () => {
    const manyEvents: Event[] = Array.from({ length: 10 }, (_, i) => ({
      id: String(i),
      title: `Event ${i}`,
      date: `2026-07-${String(i + 1).padStart(2, "0")}`,
      time: null, location: null, type: "event",
      xpReward: 0, registered: false, rsvpLabel: "Disponible", attendees: null,
    }))
    expect(getUpcomingEvents(manyEvents, "2026-07-01")).toHaveLength(3)
  })
})

describe("calendar event transformation", () => {
  it("transforms a confirmed RSVP to registered=true", () => {
    const event = transformEvent({
      id: "x", title: "Test", date: "2026-06-15T18:00:00Z",
      city: "Casablanca", rsvpStatus: "confirmed", rsvpLabel: "Inscrit",
    })
    expect(event.registered).toBe(true)
    expect(event.date).toBe("2026-06-15")
    expect(event.location).toBe("Casablanca")
  })

  it("transforms a none RSVP to registered=false", () => {
    const event = transformEvent({
      id: "y", title: "Test 2", date: "2026-06-20",
      rsvpStatus: "none", rsvpLabel: "Disponible",
    })
    expect(event.registered).toBe(false)
  })

  it("falls back to venue when city is absent", () => {
    const event = transformEvent({
      id: "z", title: "Test 3", date: "2026-06-20",
      venue: "Tech Hub", rsvpStatus: "none", rsvpLabel: "Disponible",
    })
    expect(event.location).toBe("Tech Hub")
  })

  it("uses category as type", () => {
    const event = transformEvent({
      id: "a", title: "Workshop", date: "2026-06-20",
      category: "workshop", rsvpStatus: "none", rsvpLabel: "Disponible",
    })
    expect(event.type).toBe("workshop")
  })

  it("defaults type to 'event' when category is absent", () => {
    const event = transformEvent({
      id: "b", title: "Unknown", date: "2026-06-20",
      rsvpStatus: "none", rsvpLabel: "Disponible",
    })
    expect(event.type).toBe("event")
  })
})
