/**
 * POST /api/newsletter/subscribe
 *
 * Comportement:
 *  - Tente d'inserer l'email dans la table `newsletter_subscribers`.
 *  - Si la table n'existe pas ou que la DB n'est pas joignable, on ne ment pas:
 *    on renvoie un 503 avec un message produit clair, et on logge cote serveur.
 *  - Si l'email est deja inscrit, on renvoie 200 avec `already_subscribed: true`
 *    pour eviter les fuites d'information mais sans pretendre une nouvelle inscription.
 */

import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { withSupabaseTimeout } from "@/lib/supabase/wrapper"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const rawEmail = (body?.email ?? "").toString().trim().toLowerCase()

    if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
      return NextResponse.json(
        { success: false, error: "Adresse email invalide." },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    const { error } = await withSupabaseTimeout(
      supabase
        .from("newsletter_subscribers")
        .insert({
          email: rawEmail,
          source: "home_form",
        }),
      "newsletter_subscribers.insert",
      8000
    )

    if (error) {
      // Conflit unique = deja inscrit
      const code = (error as { code?: string }).code
      if (code === "23505") {
        return NextResponse.json(
          { success: true, already_subscribed: true, message: "Tu es deja inscrit." },
          { status: 200 }
        )
      }

      // Table absente / acces refuse -> degrade explicite
      if (code === "42P01" || code === "PGRST205") {
        console.warn(
          "[newsletter] Table 'newsletter_subscribers' indisponible. Email non enregistre:",
          rawEmail
        )
        return NextResponse.json(
          {
            success: false,
            code: "NEWSLETTER_UNAVAILABLE",
            error:
              "L'inscription a la newsletter n'est pas encore disponible. Reviens bientot.",
          },
          { status: 503 }
        )
      }

      console.error("[newsletter] insert error:", error)
      return NextResponse.json(
        {
          success: false,
          code: "NEWSLETTER_ERROR",
          error: "Inscription temporairement indisponible. Reessaie plus tard.",
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { success: true, message: "Merci, tu es inscrit a notre newsletter." },
      { status: 201 }
    )
  } catch (error) {
    console.error("[newsletter] unexpected error:", error)
    return NextResponse.json(
      {
        success: false,
        code: "NEWSLETTER_ERROR",
        error: "Inscription temporairement indisponible.",
      },
      { status: 503 }
    )
  }
}
