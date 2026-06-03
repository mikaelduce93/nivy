import { createServiceRoleClient } from "@/lib/supabase/service-role"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"
import { sendTeenMagicLinkEmail } from "@/lib/email/teen-access"
import { z } from "zod"

/**
 * POST /api/auth/validate-teen — canonical implementation per Wave 1A.
 *
 * Canon refs:
 *   - docs/canon/auth-onboarding.locked.md §1 (teen row), §6 FORBIDDEN #1/#5/#6
 *   - docs/canon/roles-permissions.locked.md §1 (profiles.role enum)
 *   - Wave 0 founder ruling: audit_log singular, F1 parent-invited only.
 *
 * Identity invariant enforced:
 *   auth.users.id === profiles.id === teens.id === parent_teen_links.teen_id.
 *
 * The route NEVER inserts directly into `profiles` — it relies on the
 * `handle_new_user` trigger (which already creates the profiles row AND a
 * teens row when raw_user_meta_data.role === 'teen').
 */

// ─── GET — token validity check (unchanged) ───────────────────────────────
export async function GET(request: Request) {
  try {
    // #26 — pending_teen_registrations is RLS service-role-only.
    const admin = createServiceRoleClient()
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token manquant" },
        { status: 400 }
      )
    }

    const { data: registration, error } = await withSupabaseTimeout(
      admin
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

    if (new Date(registration.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Ce lien a expiré. Veuillez demander un nouveau lien." },
        { status: 410 }
      )
    }

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
        // #26 — surface the teen email captured at registration (if any) so the
        // approve form can pre-fill it; the approve POST requires teen_email or
        // teen_phone (superRefine).
        teenEmail: registration.teen_email ?? null,
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

// ─── POST — approve/reject (canonical rewrite) ───────────────────────────
const E164_RE = /^\+[1-9]\d{7,14}$/

const approveSchema = z.object({
  token: z.string().min(1),
  action: z.literal("approve"),
  teen_email: z.string().email().optional(),
  teen_phone: z
    .string()
    .regex(E164_RE, "teen_phone must be E.164 (e.g. +212600000000)")
    .optional(),
})

const rejectSchema = z.object({
  token: z.string().min(1),
  action: z.literal("reject"),
})

const bodySchema = z
  .discriminatedUnion("action", [approveSchema, rejectSchema])
  .superRefine((v, ctx) => {
    if (v.action === "approve" && !v.teen_email && !v.teen_phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["teen_email"],
        message: "Either teen_email or teen_phone is required",
      })
    }
  })

export async function POST(request: Request) {
  try {
    // #26 — pending_teen_registrations is RLS service-role-only; all reads/
    // writes to it (find, reject, approve) go through the service-role client.
    const admin = createServiceRoleClient()
    const userInfo = await getUserRole()

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: "Vous devez être connecté pour valider" },
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
    const { token, action } = body

    // Find pending registration
    const { data: registration, error: regError } = await withSupabaseTimeout(
      admin
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

    if (registration.parent_email.toLowerCase() !== userInfo.email?.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Vous n'êtes pas autorisé à valider cette demande" },
        { status: 403 }
      )
    }

    if (new Date(registration.token_expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: "Ce lien a expiré" },
        { status: 410 }
      )
    }

    // ─── REJECT branch ──────────────────────────────────────────────────
    if (action === "reject") {
      await withSupabaseTimeout(
        admin
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

      return NextResponse.json({ success: true, message: "Demande refusée" })
    }

    // ─── APPROVE branch — canonical identity creation ───────────────────
    if (userInfo.role !== "parent") {
      return NextResponse.json(
        { success: false, error: "Seul un parent peut valider cette demande" },
        { status: 403 }
      )
    }

    const teenEmail = body.teen_email
    const teenPhone = body.teen_phone

    const fullName = `${registration.teen_first_name} ${registration.teen_last_name}`.trim()

    // (admin service-role client already created at the top of POST — reused
    // here for the auth.admin.* operations.)

    // 1. Create the auth.users row. The handle_new_user trigger will create
    //    the matching profiles row (role='teen') AND a teens row from
    //    raw_user_meta_data.role='teen'. This is the ONLY supported entry
    //    point — direct INSERT INTO public.profiles is forbidden by canon
    //    §6 FORBIDDEN #1.
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
        first_name: registration.teen_first_name,
        last_name: registration.teen_last_name,
        date_of_birth: registration.date_of_birth,
        parent_id: userInfo.profileId,
      },
    }
    if (teenEmail) createUserPayload.email = teenEmail
    if (teenPhone) {
      createUserPayload.phone = teenPhone
      createUserPayload.phone_confirm = false
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser(
      createUserPayload as Parameters<typeof admin.auth.admin.createUser>[0]
    )

    if (createErr || !created?.user) {
      console.error("validate-teen: auth.admin.createUser failed", createErr)
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

    // 2. Insert teens row (id == auth.users.id). The trigger may have
    //    already created a stub row (id only) — UPSERT semantics keep us
    //    idempotent with the canonical FK invariant.
    const teenUpsert: Record<string, unknown> = {
      id: teenUid,
      first_name: registration.teen_first_name,
      last_name: registration.teen_last_name,
      date_of_birth: registration.date_of_birth,
    }
    // #309 — carry the pre-auth "vibe" archetype onto the teen row (consumed by
    // the coach, #303). Only set when present so we never null an existing pick.
    if (registration.archetype) teenUpsert.archetype = registration.archetype

    const { error: teenInsertErr } = await admin
      .from("teens")
      .upsert(teenUpsert, { onConflict: "id" })

    if (teenInsertErr) {
      console.error("validate-teen: teens upsert failed, rolling back", teenInsertErr)
      const { error: rollbackErr } = await admin.auth.admin.deleteUser(teenUid)
      console.error(
        rollbackErr
          ? `validate-teen: rollback deleteUser FAILED for ${teenUid}: ${rollbackErr.message}`
          : `validate-teen: rollback deleteUser succeeded for ${teenUid}`
      )
      return NextResponse.json(
        { success: false, error: "Erreur lors de la création du profil teen" },
        { status: 500 }
      )
    }

    // 3. Insert parent_teen_links row (atomic with respect to the auth user).
    const { error: linkErr } = await admin
      .from("parent_teen_links")
      .insert({
        parent_id: userInfo.profileId,
        teen_id: teenUid,
        status: "active",
        created_at: new Date().toISOString(),
      })

    if (linkErr) {
      console.error("validate-teen: parent_teen_links insert failed, rolling back", linkErr)
      const { error: rollbackErr } = await admin.auth.admin.deleteUser(teenUid)
      console.error(
        rollbackErr
          ? `validate-teen: rollback deleteUser FAILED for ${teenUid}: ${rollbackErr.message}`
          : `validate-teen: rollback deleteUser succeeded for ${teenUid}`
      )
      return NextResponse.json(
        { success: false, error: "Erreur lors de la liaison parent-teen" },
        { status: 500 }
      )
    }

    // 4. Set is_onboarded=false explicitly (already the default; safe write).
    await admin
      .from("profiles")
      .update({ is_onboarded: false })
      .eq("id", teenUid)

    // 5. Mark the registration validated.
    await admin
      .from("pending_teen_registrations")
      .update({
        status: "validated",
        validated_at: new Date().toISOString(),
        validated_by: userInfo.profileId,
        created_teen_id: teenUid,
      })
      .eq("id", registration.id)

    // 6. Generate a magic link for the teen AND email it to them so the
    //    account is actually accessible. #291 — the link was previously
    //    returned in the JSON then dropped ("forward to teen out-of-band"),
    //    leaving the account unreachable. Email-based magic-link is the canon
    //    path per §1 (teen row).
    let actionLink: string | null = null
    let magicLinkEmailed = false
    if (teenEmail) {
      const { data: linkData, error: linkGenErr } = await admin.auth.admin.generateLink({
        type: "magiclink",
        email: teenEmail,
      })
      if (linkGenErr) {
        console.error("validate-teen: generateLink failed", linkGenErr)
      } else {
        actionLink = linkData?.properties?.action_link ?? null
        if (actionLink) {
          magicLinkEmailed = await sendTeenMagicLinkEmail({
            teenEmail,
            teenName: fullName,
            actionLink,
          })
        }
      }
    }

    // 7. Audit (singular table per founder ruling).
    await admin.from("audit_log").insert({
      actor_id: userInfo.profileId,
      actor_role: "parent",
      action: "validate_teen.approve",
      resource_type: "pending_teen_registration",
      resource_id: registration.id,
      target_user_id: teenUid,
      description: `Parent validated teen registration; teen auth.users.id=${teenUid}`,
      metadata: {
        teen_email: teenEmail ?? null,
        teen_phone: teenPhone ?? null,
        magic_link_generated: actionLink !== null,
        magic_link_emailed: magicLinkEmailed,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Compte teen créé et lié à votre profil parent",
      data: {
        teenId: teenUid,
        teenName: fullName,
        // #291 — the magic-link is emailed to the teen (magic_link_emailed).
        // We still surface it so the parent can forward it manually as a
        // fallback when email delivery is unavailable.
        magicLinkEmailed,
        actionLink: magicLinkEmailed ? null : actionLink,
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
