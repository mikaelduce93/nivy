export interface EventBookingProduct {
  bookingId: string
  eventTitle: string
  eventDate: string
  priceInCents: number
  quantity: number
}

export interface ClubMembershipProduct {
  clubId: string
  clubName: string
  packageType: "monthly" | "quarterly" | "annual"
  priceInCents: number
}

export type Product = EventBookingProduct | ClubMembershipProduct

// Helper function to create a product from booking data
export function createEventBookingProduct(booking: any): EventBookingProduct {
  return {
    bookingId: booking.id,
    eventTitle: booking.events?.title || "Événement",
    eventDate: booking.events?.event_date || new Date().toISOString(),
    priceInCents: Math.round(booking.total_amount * 100), // Convert DH to cents
    quantity: 1,
  }
}

// Helper function to create a product from club membership
export function createClubMembershipProduct(
  clubId: string,
  clubName: string,
  packageType: "monthly" | "quarterly" | "annual",
  priceInDH: number,
): ClubMembershipProduct {
  return {
    clubId,
    clubName,
    packageType,
    priceInCents: Math.round(priceInDH * 100),
  }
}
