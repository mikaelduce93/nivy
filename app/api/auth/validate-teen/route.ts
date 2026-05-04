import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"

/**
 * Validate a teen registration request (called by parent)
 *
 * Flow:
 * 1. Parent clicks validation link with token
 * 2. System verifies token is valid and not expired
 * 3. If parent not logged in, redirects to login/signup
 * 4. If parent logged in, creates parent-teen relationship
 * 5. Activates teen account
 */

// GET: Check token validity
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token manquant" },
        { status: 400 }
      )
    }

    // Find pending registration
    const { data: registration, error } = await withSupabaseTimeout(
      supabase
        .from("pending_teen_registrations")
        .select("*")
        .eq("validation_token", token)
        .single(),
      `from('pending_teen_registrations').select()`,
      10000
    )

    if (error || !registration) {
      return NextResponse.json(
        { success: false, error: "Lien de validation invalide ou expiré" },
        { status: 404 }
      )
    }

    // Check expiry
    if (new Date(registration.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Ce lien a expiré. Veuillez demander un nouveau lien." },
        { status: 410 }
      )
    }

    // Check if already validated
    if (registration.status === "validated") {
      return NextResponse.json(
        { success: false, error: "Cette demande a déjà été validée" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        teenName: `${registration.teen_first_name} ${registration.teen_last_name}`,
        teenAge: calculateAge(registration.date_of_birth),
        parentEmail: registration.parent_email,
        status: registration.status,
      },
    })
  } catch (error) {
    console.error("Validate teen GET error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Approve or reject teen registration
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    // Must be authenticated
    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: "Vous devez être connecté pour valider" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { token, action } = body

    if (!token || !action) {
      return NextResponse.json(
        { success: false, error: "Données manquantes" },
        { status: 400 }
      )
    }

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Action invalide" },
        { status: 400 }
      )
    }

    // Find pending registration
    const { data: registration, error: regError } = await withSupabaseTimeout(
      supabase
        .from("pending_teen_registrations")
        .select("*")
        .eq("validation_token", token)
        .single(),
      `from('pending_teen_registrations').select()`,
      10000
    )

    if (regError || !registration) {
      return NextResponse.json(
        { success: false, error: "Demande introuvable" },
        { status: 404 }
      )
    }

    // Verify parent email matches
    if (registration.parent_email.toLowerCase() !== userInfo.email?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Vous n'êtes pas autorisé à valider cette demande" },
        { status: 403 }
      )
    }

    // Check expiry
    if (new Date(registration.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Ce lien a expiré" },
        { status: 410 }
      )
    }

    // Handle rejection
    if (action === "reject") {
      await withSupabaseTimeout(
        supabase
          .from("pending_teen_registrations")
          .update({
            status: "rejected",
            validated_at: new Date().toISOString(),
            validated_by: userInfo.profileId,
          })
          .eq("id", registration.id),
        `from('pending_teen_registrations').update()`,
        10000
      )

      return NextResponse.json({
        success: true,
        message: "Demande refusée",
      })
    }

    // Handle approval
    // 1. Ensure current user is a parent
    if (userInfo.role !== "parent") {
      // Update their role to parent
      await withSupabaseTimeout(
        supabase
          .from("profiles")
          .update({ role: "parent" })
          .eq("id", userInfo.profileId),
        `from('profiles').update()`,
        10000
      )
    }

    // 2. Create teen profile
    const { data: teenProfile, error: profileError } = await withSupabaseTimeout(
      supabase
        .from("profiles")
        .insert({
          email: registration.teen_email || `teen_${registration.id}@teensparty.local`,
          full_name: `${registration.teen_first_name} ${registration.teen_last_name}`,
          role: "teen",
        })
        .select()
        .single(),
      `from('profiles').insert()`,
      10000
    )

    if (profileError) {
      console.error("Teen profile creation error:", profileError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du profil teen" },
        { status: 500 }
      )
    }

    // 3. Create teen full profile
    const { error: teenDataError } = await withSupabaseTimeout(
      supabase
        .from("teen_full_profile")
        .insert({
          id: teenProfile.id,
          first_name: registration.teen_first_name,
          last_name: registration.teen_last_name,
          date_of_birth: registration.date_of_birth,
          primary_parent_id: userInfo.profileId,
          level: 1,
          title: "Nouveau",
          title_icon: "🌟",
          coins_balance: 100, // Welcome bonus
        }),
      `from('teen_full_profile').insert()`,
      10000
    )

    if (teenDataError) {
      console.error("Teen data creation error:", teenDataError)
    }

    // 4. Create parent-teen relationship
    const { error: relationError } = await withSupabaseTimeout(
      supabase
        .from("parent_teen_links")
        .insert({
          parent_id: userInfo.profileId,
          teen_id: teenProfile.id,
          status: "active",
          created_at: new Date().toISOString(),
        }),
      `from('parent_teen_links').insert()`,
      10000
    )

    if (relationError) {
      console.error("Relationship creation error:", relationError)
    }

    // 5. Update registration status
    await withSupabaseTimeout(
      supabase
        .from("pending_teen_registrations")
        .update({
          status: "validated",
          validated_at: new Date().toISOString(),
          validated_by: userInfo.profileId,
          created_teen_id: teenProfile.id,
        })
        .eq("id", registration.id),
      `from('pending_teen_registrations').update()`,
      10000
    )

    // 6. Award XP to parent for verifying (non-critical, ignore errors)
    try {
      await withSupabaseTimeout(
        supabase.rpc("add_user_xp", {
          p_user_id: userInfo.profileId,
          p_xp_amount: 50,
          p_source: "teen_verification",
          p_source_id: registration.id,
        }),
        'rpc(add_user_xp)',
        10000
      )
    } catch {
      // Ignore XP errors - non-critical
    }

    return NextResponse.json({
      success: true,
      message: "Compte teen créé et lié à votre profil parent",
      data: {
        teenId: teenProfile.id,
        teenName: `${registration.teen_first_name} ${registration.teen_last_name}`,
      },
    })
  } catch (error) {
    console.error("Validate teen POST error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

function calculateAge(dateOfBirth: string): number {
  const today = new Date()
  const birth = new Date(dateOfBirth)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}
