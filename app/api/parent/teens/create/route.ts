import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { getUserRole } from "@/lib/auth/get-user-role"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      parentId,
      firstName,
      lastName,
      pseudo,
      dateOfBirth,
      avatar,
      avatarUrl,
      school,
      gradeLevel,
      profiles,
      interests,
      allergies,
      photoConsent,
      exitRules,
      emergencyContactName,
      emergencyContactPhone,
      emergencyContactRelation
    } = body

    // Verify parentId matches authenticated user
    if (parentId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { success: false, error: "Le prénom et le nom sont requis" },
        { status: 400 }
      )
    }

    if (!pseudo || pseudo.length < 3 || pseudo.length > 20) {
      return NextResponse.json(
        { success: false, error: "Le pseudo doit contenir entre 3 et 20 caractères" },
        { status: 400 }
      )
    }

    // Validate pseudo format (letters, numbers, underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(pseudo)) {
      return NextResponse.json(
        { success: false, error: "Le pseudo ne peut contenir que des lettres, chiffres et underscores" },
        { status: 400 }
      )
    }

    if (!dateOfBirth) {
      return NextResponse.json(
        { success: false, error: "La date de naissance est requise" },
        { status: 400 }
      )
    }

    // Validate age (10-18 years old)
    const birthDate = new Date(dateOfBirth)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 10 || age > 18) {
      return NextResponse.json(
        { success: false, error: "L'âge doit être entre 10 et 18 ans" },
        { status: 400 }
      )
    }

    // Validate profiles (max 2)
    if (profiles && profiles.length > 2) {
      return NextResponse.json(
        { success: false, error: "Maximum 2 profils autorisés" },
        { status: 400 }
      )
    }

    // Validate phone format if provided
    if (emergencyContactPhone && !/^(\+212|0)[5-7]\d{8}$/.test(emergencyContactPhone)) {
      return NextResponse.json(
        { success: false, error: "Format de téléphone invalide" },
        { status: 400 }
      )
    }

    // Check if pseudo is already taken in profiles table
    const { data: existingPseudo } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", pseudo.toLowerCase())
      .maybeSingle()

    if (existingPseudo) {
      return NextResponse.json(
        { success: false, error: "Ce pseudo est déjà utilisé" },
        { status: 400 }
      )
    }

    // Also check in teens table if it exists
    const { data: existingTeenPseudo } = await supabase
      .from("teens")
      .select("id")
      .eq("pseudo", pseudo.toLowerCase())
      .maybeSingle()

    if (existingTeenPseudo) {
      return NextResponse.json(
        { success: false, error: "Ce pseudo est déjà utilisé" },
        { status: 400 }
      )
    }

    // Generate a unique linking code using cryptographically strong randomness.
    // 4 bytes -> 8 hex chars; matches the prior code length.
    const linkingCode = `TEEN${randomBytes(4).toString("hex").toUpperCase()}`

    // Create teen profile with all enriched fields
    const { data: teenProfile, error: createError } = await supabase
      .from("profiles")
      .insert({
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        username: pseudo.toLowerCase(),
        avatar: avatar || "🦁",
        avatar_url: avatarUrl || null,
        role: "teen",
        date_of_birth: dateOfBirth,
        linking_code: linkingCode,
        xp: 0,
        coins: 0,
        level: 1,
        // Enriched fields
        school: school || null,
        grade_level: gradeLevel || null,
        profiles: profiles || [],
        interests: interests || [],
        allergies: allergies || null,
        photo_consent: photoConsent || false,
        exit_permission_rules: exitRules || null,
        emergency_contact_name: emergencyContactName || null,
        emergency_contact_phone: emergencyContactPhone || null,
        emergency_contact_relation: emergencyContactRelation || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createError) {
      console.error("Error creating teen profile:", createError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du profil" },
        { status: 500 }
      )
    }

    // Create parent-teen link (already approved since parent is creating)
    const { error: linkError } = await supabase
      .from("parent_teen_links")
      .insert({
        parent_id: parentId,
        teen_id: teenProfile.id,
        status: "approved",
        created_at: new Date().toISOString(),
        approved_at: new Date().toISOString()
      })

    if (linkError) {
      console.error("Error creating parent-teen link:", linkError)
      // Don't fail the whole operation, just log the error
    }

    // Log activity
    await supabase.from("activity_logs").insert({
      user_id: parentId,
      action: "create",
      description: `Création d'un compte teen: ${firstName} ${lastName} (@${pseudo})`,
      resource_type: "teen_profile",
      resource_id: teenProfile.id,
      created_at: new Date().toISOString()
    })

    // Create notification for parent
    await supabase.from("notifications").insert({
      user_id: parentId,
      type: "teen_created",
      title: "Compte Teen créé",
      message: `Le compte de ${firstName} a été créé avec succès. Code de liaison: ${linkingCode}`,
      read: false,
      created_at: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: {
        id: teenProfile.id,
        full_name: teenProfile.full_name,
        username: teenProfile.username,
        linking_code: linkingCode
      },
      message: "Compte Teen créé avec succès"
    })
  } catch (error) {
    console.error("Parent create teen API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
