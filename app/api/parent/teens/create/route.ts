import { createClient } from "@/lib/supabase/server"
import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { randomBytes } from "node:crypto"
import { getUserRole } from "@/lib/auth/get-user-role"
import { z } from "zod"

/**
 * POST /api/parent/teens/create — canonical implementation per Wave 1A.
 *
 * Same identity contract as /api/auth/validate-teen:
 *   auth.users.id === profiles.id === teens.id === parent_teen_links.teen_id.
 *
 * Direct INSERT INTO public.profiles is forbidden (canon §6 FORBIDDEN #1).
 * Identity is created via supabase.auth.admin.createUser; the
 * handle_new_user trigger lands the profiles row from
 * raw_user_meta_data.role='teen'.
 */

const E164_RE = /^\+[1-9]\d{7,14}$/
const PHONE_MA_RE = /^(\+212|0)[5-7]\d{8}$/

const bodySchema = z
  .object({
    parentId: z.string().uuid(),
    firstName: z.string().min(1).max(120),
    lastName: z.string().min(1).max(120),
    pseudo: z
      .string()
      .min(3)
      .max(20)
      .regex(/^[a-zA-Z0-9_]+$/),
    dateOfBirth: z.string().min(1),
    teen_email: z.string().email().optional(),
    teen_phone: z.string().regex(E164_RE).optional(),
    avatar: z.string().optional(),
    avatarUrl: z.string().url().optional().nullable(),
    school: z.string().optional().nullable(),
    gradeLevel: z.string().optional().nullable(),
    profiles: z.array(z.unknown()).max(2).optional(),
    interests: z.array(z.string()).optional(),
    allergies: z.string().optional().nullable(),
    photoConsent: z.boolean().optional(),
    exitRules: z.string().optional().nullable(),
    emergencyContactName: z.string().optional().nullable(),
    emergencyContactPhone: z
      .string()
      .regex(PHONE_MA_RE, "Format de téléphone invalide")
      .optional()
      .nullable(),
    emergencyContactRelation: z.string().optional().nullable(),
  })
  .refine((v) => Boolean(v.teen_email) || Boolean(v.teen_phone), {
    message: "teen_email or teen_phone is required",
    path: ["teen_email"],
  })

export async function POST(request: Request) {
  try {
    const userInfo = await getUserRole()

    if (!userInfo || userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    const rawBody = await request.json().catch(() => null)
    const parsed = bodySchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Requête invalide",
          details: parsed.error.flatten(),
        },
        { status: 400 }
      )
    }

    const body = parsed.data

    if (body.parentId !== userInfo.profileId) {
      return NextResponse.json(
        { success: false, error: "Non autorisé" },
        { status: 401 }
      )
    }

    // Age window 10–18 (canon §1 teen row).
    const birthDate = new Date(body.dateOfBirth)
    if (Number.isNaN(birthDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Date de naissance invalide" },
        { status: 400 }
      )
    }
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

    const supabase = await createClient()
    const pseudoLower = body.pseudo.toLowerCase()

    // Pseudo uniqueness — defensive read via the user-bound client.
    const { data: existingPseudoProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", pseudoLower)
      .maybeSingle()

    if (existingPseudoProfile) {
      return NextResponse.json(
        { success: false, error: "Ce pseudo est déjà utilisé" },
        { status: 400 }
      )
    }

    const { data: existingTeenPseudo } = await supabase
      .from("teens")
      .select("id")
      .eq("pseudo", pseudoLower)
      .maybeSingle()

    if (existingTeenPseudo) {
      return NextResponse.json(
        { success: false, error: "Ce pseudo est déjà utilisé" },
        { status: 400 }
      )
    }

    // Linking code (kept for parent-side display; canonical 6-digit code is
    // a separate Wave M18 deliverable — out of scope for AUTH-FIX-3).
    const linkingCode = `TEEN${randomBytes(4).toString("hex").toUpperCase()}`

    // Service-role for auth.admin operations (canon §3.5).
    const admin = createServiceRoleClient()
    const fullName = `${body.firstName.trim()} ${body.lastName.trim()}`

    // 1. Create the auth.users row. The handle_new_user trigger creates
    //    profiles + teens stub rows.
    const createUserPayload: {
      email?: string
      phone?: string
      email_confirm: boolean
      phone_confirm?: boolean
      user_metadata: Record<string, unknown>
    } = {
      email_confirm: false,
      user_metadata: {
        role: "teen",
        full_name: fullName,
        first_name: body.firstName,
        last_name: body.lastName,
        date_of_birth: body.dateOfBirth,
        parent_id: userInfo.profileId,
        pseudo: pseudoLower,
      },
    }
    if (body.teen_email) createUserPayload.email = body.teen_email
    if (body.teen_phone) {
      createUserPayload.phone = body.teen_phone
      createUserPayload.phone_confirm = false
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser(
      createUserPayload as Parameters<typeof admin.auth.admin.createUser>[0]
    )

    if (createErr || !created?.user) {
      console.error("parent/teens/create: auth.admin.createUser failed", createErr)
      return NextResponse.json(
        {
          success: false,
          error:
            "Impossible de créer le compte teen (Supabase Auth). " +
            "Vérifie l'email/téléphone ou contacte le support.",
        },
        { status: 500 }
      )
    }

    const teenUid = created.user.id

    // 2. Enrich the teens row (trigger-created stub) with full profile data.
    const { error: teenUpsertErr } = await admin
      .from("teens")
      .upsert(
        {
          id: teenUid,
          first_name: body.firstName,
          last_name: body.lastName,
          pseudo: pseudoLower,
          date_of_birth: body.dateOfBirth,
          avatar_url: body.avatarUrl ?? null,
          school_type: body.school ?? null,
          grade_level: body.gradeLevel ?? null,
        },
        { onConflict: "id" }
      )

    if (teenUpsertErr) {
      console.error("parent/teens/create: teens upsert failed, rolling back", teenUpsertErr)
      const { error: rollbackErr } = await admin.auth.admin.deleteUser(teenUid)
      console.error(
        rollbackErr
          ? `parent/teens/create: rollback deleteUser FAILED for ${teenUid}: ${rollbackErr.message}`
          : `parent/teens/create: rollback deleteUser succeeded for ${teenUid}`
      )
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du profil teen" },
        { status: 500 }
      )
    }

    // 3. Username + linking_code on profiles (created by trigger).
    await admin
      .from("profiles")
      .update({
        username: pseudoLower,
        avatar_url: body.avatarUrl ?? null,
        is_onboarded: false,
      })
      .eq("id", teenUid)

    // 4. parent_teen_links — atomic with respect to the auth user.
    const { error: linkErr } = await admin
      .from("parent_teen_links")
      .insert({
        parent_id: body.parentId,
        teen_id: teenUid,
        status: "active",
        created_at: new Date().toISOString(),
      })

    if (linkErr) {
      console.error("parent/teens/create: parent_teen_links insert failed, rolling back", linkErr)
      const { error: rollbackErr } = await admin.auth.admin.deleteUser(teenUid)
      console.error(
        rollbackErr
          ? `parent/teens/create: rollback deleteUser FAILED for ${teenUid}: ${rollbackErr.message}`
          : `parent/teens/create: rollback deleteUser succeeded for ${teenUid}`
      )
      return NextResponse.json(
        { success: false, error: "Erreur lors de la liaison parent-teen" },
        { status: 500 }
      )
    }

    // 5. Magic link.
    let actionLink: string | null = null
    if (body.teen_email) {
      const { data: linkData, error: linkGenErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: body.teen_email,
      })
      if (linkGenErr) {
        console.error("parent/teens/create: generateLink failed", linkGenErr)
      } else {
        actionLink = linkData?.properties?.action_link ?? null
      }
    }

    // 6. Notify parent (canonical user_notifications, NOT deprecated
    //    `notifications`/`activity_logs`).
    await admin.from("user_notifications").insert({
      user_id: body.parentId,
      type: "teen_created",
      title: "Compte Teen créé",
      message: `Le compte de ${body.firstName} a été créé avec succès. Code de liaison : ${linkingCode}`,
      read: false,
    })

    // 7. Audit (singular).
    await admin.from("audit_log").insert({
      actor_id: userInfo.profileId,
      actor_role: "parent",
      action: "parent.teens.create",
      resource_type: "teen",
      resource_id: teenUid,
      target_user_id: teenUid,
      description: `Parent created teen ${pseudoLower} (auth.users.id=${teenUid})`,
      metadata: {
        teen_email: body.teen_email ?? null,
        teen_phone: body.teen_phone ?? null,
        magic_link_generated: actionLink !== null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        id: teenUid,
        full_name: fullName,
        username: pseudoLower,
        linking_code: linkingCode,
        actionLink,
      },
      message: "Compte Teen créé avec succès",
    })
  } catch (error) {
    console.error("Parent create teen API error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
