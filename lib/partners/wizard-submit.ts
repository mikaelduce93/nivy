/**
 * Wave 3A.5 — shared client helper that posts the canonical partner wizard
 * payload to /api/partners/wizard/submit (canon §4.7).
 *
 * The 4 legacy commerce forms (Retail / Venue / Club / Education) all funnel
 * through this so we never reintroduce orphan-partner inserts. Password is
 * required by the canonical schema (canon §2 stage 2).
 */

export type WizardPartnerType =
  | "retail"
  | "venue"
  | "club"
  | "education"
  | "food"
  | "event_talent"
  | "event_organizer"
  | "creator"

export interface WizardSubmitPayload {
  partner_type: WizardPartnerType
  company_name: string
  email: string
  password: string
  phone?: string | null
  website?: string | null
  description?: string | null
  contact_person_name?: string | null
  contact_person_role?: string | null
  contact_person_phone?: string | null
  contact_person_email?: string | null
  rc_number?: string | null
  ice_number?: string | null
  patente_number?: string | null
  locations?: Array<Record<string, unknown>>
  discounts?: Array<Record<string, unknown>>
  venue_details?: Record<string, unknown>
  menu_items?: Array<Record<string, unknown>>
  event_packages?: Array<Record<string, unknown>>
  club_details?: Record<string, unknown>
  offerings?: Array<Record<string, unknown>>
  education_details?: Record<string, unknown>
  courses?: Array<Record<string, unknown>>
}

export interface WizardSubmitResult {
  ok: boolean
  partner_id?: string
  next_step?: string
  error?: string
}

export async function submitPartnerWizard(
  payload: WizardSubmitPayload,
): Promise<WizardSubmitResult> {
  const res = await fetch("/api/partners/wizard/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok || !json?.success) {
    return { ok: false, error: json?.error ?? `HTTP ${res.status}` }
  }
  return {
    ok: true,
    partner_id: json.partner_id,
    next_step: json.next_step,
  }
}
