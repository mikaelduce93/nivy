'use server'

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function submitBirthdayRequest(data: {
  guestCount: number
  celebrationDate: string
  packSlug: string
  totalPrice: number
}) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1. Get Teen profile and linked parent
  const { data: teenProfile, error: teenError } = await supabase
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", user.id)
    .single()

  if (teenError || teenProfile.role !== 'teen') {
    throw new Error("Only teens can organize their birthday")
  }

  // Find linked parent
  const { data: relationship, error: relError } = await supabase
    .from("parent_teen_links")
    .select("parent_id")
    .eq("teen_id", user.id)
    .eq("status", "active")
    .limit(1)
    .single()

  if (relError || !relationship) {
    throw new Error("No active parent relationship found. Please link your account to a parent first.")
  }

  // 2. Get Pack ID
  const { data: pack, error: packError } = await supabase
    .from("anniv_packs")
    .select("id")
    .eq("slug", data.packSlug)
    .single()

  if (packError) throw new Error("Invalid pack selected")

  // 3. Create Pending Anniv Order
  // Note: We need to handle the 'teens' table vs 'profiles' table discrepancy.
  // In many migrations, 'teens' table is used for child profiles.
  // We'll try to find a record in 'teens' linked to this profile or use the profile ID if allowed.
  const { data: teenRecord } = await supabase
    .from("teens")
    .select("id")
    .eq("parent_id", relationship.parent_id)
    .limit(1)
    .single()

  const { data: order, error: orderError } = await supabase
    .from("anniv_orders")
    .insert({
      parent_id: relationship.parent_id,
      teen_id: teenRecord?.id || user.id, // Fallback to user.id if no teen record found
      pack_id: pack.id,
      order_type: 'event', // Default for now
      celebration_date: data.celebrationDate,
      guest_count: data.guestCount,
      pack_price: data.totalPrice, // Simplified for the demo
      total_price: data.totalPrice,
      status: 'pending',
      payment_status: 'pending'
    })
    .select()
    .single()

  if (orderError) {
    console.error("Order creation error:", orderError)
    throw new Error("Failed to create birthday order")
  }

  // 4. Create Parental Approval Request
  const { error: approvalError } = await supabase
    .from("parental_approvals")
    .insert({
      teen_id: user.id,
      parent_id: relationship.parent_id,
      approval_type: 'purchase',
      request_data: {
        type: 'birthday',
        order_id: order.id,
        pack_name: data.packSlug,
        date: data.celebrationDate,
        price: data.totalPrice,
        guests: data.guestCount
      },
      status: 'pending'
    })

  if (approvalError) {
    console.error("Approval request error:", approvalError)
    throw new Error("Failed to send request to parent")
  }

  revalidatePath('/teen')
  revalidatePath('/parent')
  
  return { success: true, orderId: order.id }
}
