"use server"

/**
 * Wave V1.2-F — Partner support ticket creation.
 *
 * The `support_tickets` table only exposes a SELECT RLS policy
 * (`requester_user_id = auth.uid() OR assigned_to = auth.uid()`) and no INSERT
 * policy, so authenticated users cannot insert with the anon client. This
 * server action validates the request, then writes via the service-role client
 * with `requester_user_id` pinned to the resolved auth user — preventing
 * impersonation.
 */
import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"

export type CreateTicketResult =
  | { ok: true; ticketId: string }
  | { ok: false; error: string }

export async function createPartnerSupportTicket(
  formData: FormData,
): Promise<CreateTicketResult> {
  const subject = String(formData.get("subject") || "").trim()
  const body = String(formData.get("body") || "").trim()

  if (subject.length < 3) {
    return { ok: false, error: "Le sujet doit contenir au moins 3 caractères." }
  }
  if (subject.length > 200) {
    return { ok: false, error: "Le sujet est trop long (200 caractères max)." }
  }
  if (body.length < 10) {
    return { ok: false, error: "Le message doit contenir au moins 10 caractères." }
  }
  if (body.length > 5000) {
    return { ok: false, error: "Le message est trop long (5000 caractères max)." }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: "Session expirée — reconnectez-vous." }

  const sr = createServiceRoleClient()
  const { data, error } = await sr
    .from("support_tickets")
    .insert({
      requester_user_id: user.id,
      subject,
      body,
      status: "open",
    })
    .select("id")
    .single()

  if (error || !data) {
    return { ok: false, error: error?.message || "Échec de l'envoi." }
  }

  revalidatePath("/partner/support")
  return { ok: true, ticketId: data.id }
}
