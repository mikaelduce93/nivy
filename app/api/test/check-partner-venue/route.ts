import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const email = "venue.partner@teenclub.ma"

    const diagnostics: any = {
      email,
      timestamp: new Date().toISOString(),
      checks: {}
    }

    // 1. Vérifier si le profil existe
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .eq("email", email)
      .single()

    diagnostics.checks.profile = {
      exists: !!profile,
      error: profileError?.message || null,
      data: profile ? {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        role: profile.role,
        created_at: profile.created_at
      } : null
    }

    // 2. Vérifier si le partenaire existe dans la table partners
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("id, company_name, partner_type, status, email")
      .eq("email", email)
      .single()

    diagnostics.checks.partner = {
      exists: !!partner,
      error: partnerError?.message || null,
      data: partner ? {
        id: partner.id,
        company_name: partner.company_name,
        partner_type: partner.partner_type,
        status: partner.status,
        email: partner.email
      } : null
    }

    // 3. Vérifier si un utilisateur auth existe (via service role si possible)
    // Note: On ne peut pas vérifier directement auth.users sans service role
    diagnostics.checks.auth = {
      note: "La vérification de auth.users nécessite le service role. Vérifiez manuellement dans Supabase Dashboard."
    }

    // Résumé
    diagnostics.summary = {
      profileExists: !!profile,
      partnerExists: !!partner,
      roleCorrect: profile?.role === "partner",
      partnerStatus: partner?.status,
      allGood: !!profile && !!partner && profile.role === "partner" && partner.status === "active"
    }

    // Suggestions
    diagnostics.suggestions = []
    if (!profile) {
      diagnostics.suggestions.push("Le profil n'existe pas. Exécutez le script create_test_accounts.sql")
    }
    if (profile && profile.role !== "partner") {
      diagnostics.suggestions.push(`Le profil existe mais le rôle est "${profile.role}" au lieu de "partner"`)
    }
    if (!partner) {
      diagnostics.suggestions.push("Le partenaire n'existe pas dans la table partners. Exécutez le script create_test_accounts.sql")
    }
    if (partner && partner.status !== "active") {
      diagnostics.suggestions.push(`Le partenaire existe mais le statut est "${partner.status}" au lieu de "active"`)
    }

    return NextResponse.json(diagnostics, { status: 200 })
  } catch (error: any) {
    return NextResponse.json(
      {
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    )
  }
}





