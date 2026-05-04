/**
 * API PARTAGE SOCIAL
 * ==================
 * Gestion du partage vers réseaux sociaux
 */

import { createClient } from "@/lib/supabase/server"
import { NextRequest, NextResponse } from "next/server"

// Configuration des plateformes
const PLATFORM_CONFIG: Record<string, {
  name: string
  shareUrlTemplate: string
  supportsImage: boolean
  supportsHashtags: boolean
  maxLength?: number
}> = {
  facebook: {
    name: "Facebook",
    shareUrlTemplate: "https://www.facebook.com/sharer/sharer.php?u={url}&quote={text}",
    supportsImage: false,
    supportsHashtags: true,
  },
  twitter: {
    name: "Twitter/X",
    shareUrlTemplate: "https://twitter.com/intent/tweet?url={url}&text={text}&hashtags={hashtags}",
    supportsImage: false,
    supportsHashtags: true,
    maxLength: 280,
  },
  whatsapp: {
    name: "WhatsApp",
    shareUrlTemplate: "https://wa.me/?text={text}%20{url}",
    supportsImage: false,
    supportsHashtags: false,
  },
  telegram: {
    name: "Telegram",
    shareUrlTemplate: "https://t.me/share/url?url={url}&text={text}",
    supportsImage: false,
    supportsHashtags: false,
  },
  linkedin: {
    name: "LinkedIn",
    shareUrlTemplate: "https://www.linkedin.com/sharing/share-offsite/?url={url}",
    supportsImage: false,
    supportsHashtags: false,
  },
  email: {
    name: "Email",
    shareUrlTemplate: "mailto:?subject={title}&body={text}%0A%0A{url}",
    supportsImage: false,
    supportsHashtags: false,
  },
}

// GET: Récupérer infos partage
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "stats"

    switch (type) {
      // Statistiques de partage
      case "stats": {
        const { data: stats, error } = await supabase.rpc("get_share_stats", {
          p_user_id: user.id,
        })

        if (error) throw error

        return NextResponse.json({ stats })
      }

      // Templates de cartes
      case "templates": {
        const contentType = searchParams.get("content_type")

        let query = supabase
          .from("share_card_templates")
          .select("*")
          .eq("is_active", true)

        if (contentType) {
          query = query.eq("content_type", contentType)
        }

        const { data: templates, error } = await query.order("usage_count", { ascending: false })

        if (error) throw error

        return NextResponse.json({ templates: templates || [] })
      }

      // Historique des partages
      case "history": {
        const limit = parseInt(searchParams.get("limit") || "20")
        const offset = parseInt(searchParams.get("offset") || "0")

        const { data: shares, error } = await supabase
          .from("social_shares")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)

        if (error) throw error

        return NextResponse.json({
          shares: shares || [],
          has_more: (shares?.length || 0) === limit,
        })
      }

      // Liens de partage
      case "links": {
        const { data: links, error } = await supabase
          .from("share_links")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(50)

        if (error) throw error

        return NextResponse.json({ links: links || [] })
      }

      // Cartes générées
      case "cards": {
        const { data: cards, error } = await supabase
          .from("generated_share_cards")
          .select(`
            *,
            template:share_card_templates (id, name, thumbnail_url)
          `)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20)

        if (error) throw error

        return NextResponse.json({ cards: cards || [] })
      }

      // Configuration des plateformes
      case "platforms": {
        return NextResponse.json({ platforms: PLATFORM_CONFIG })
      }

      default:
        return NextResponse.json({ error: "Type invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Share GET error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}

// POST: Actions de partage
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    switch (action) {
      // Enregistrer un partage
      case "share": {
        const {
          content_type,
          content_id,
          platform,
          title,
          description,
          hashtags = [],
        } = body

        if (!content_type || !platform) {
          return NextResponse.json(
            { error: "content_type et platform requis" },
            { status: 400 }
          )
        }

        // Vérifier que la plateforme est valide
        if (!PLATFORM_CONFIG[platform] && !["copy_link", "download", "instagram", "tiktok", "snapchat"].includes(platform)) {
          return NextResponse.json(
            { error: "Plateforme invalide" },
            { status: 400 }
          )
        }

        const { data: result, error } = await supabase.rpc("record_social_share", {
          p_user_id: user.id,
          p_content_type: content_type,
          p_content_id: content_id,
          p_platform: platform,
          p_share_data: { title, description, hashtags },
        })

        if (error) throw error

        return NextResponse.json(result)
      }

      // Créer un lien de partage
      case "create_link": {
        const {
          target_type,
          target_id,
          target_url,
          og_title,
          og_description,
          og_image,
          expires_days,
        } = body

        if (!target_type || !target_url) {
          return NextResponse.json(
            { error: "target_type et target_url requis" },
            { status: 400 }
          )
        }

        const { data: result, error } = await supabase.rpc("create_share_link", {
          p_user_id: user.id,
          p_target_type: target_type,
          p_target_id: target_id,
          p_target_url: target_url,
          p_og_title: og_title,
          p_og_description: og_description,
          p_og_image: og_image,
          p_expires_days: expires_days,
        })

        if (error) throw error

        return NextResponse.json({
          success: true,
          link: result[0],
        })
      }

      // Générer l'URL de partage pour une plateforme
      case "generate_share_url": {
        const {
          platform,
          url,
          text,
          title,
          hashtags = [],
        } = body

        if (!platform || !url) {
          return NextResponse.json(
            { error: "platform et url requis" },
            { status: 400 }
          )
        }

        const config = PLATFORM_CONFIG[platform]
        if (!config) {
          // Pour les plateformes sans URL directe (Instagram, TikTok, etc.)
          return NextResponse.json({
            success: true,
            share_url: null,
            copy_text: `${text || ""}\n\n${url}`,
            instructions: `Copiez le texte et collez-le dans ${platform}`,
          })
        }

        // Construire l'URL de partage
        let shareUrl = config.shareUrlTemplate
          .replace("{url}", encodeURIComponent(url))
          .replace("{text}", encodeURIComponent(text || ""))
          .replace("{title}", encodeURIComponent(title || ""))

        if (config.supportsHashtags && hashtags.length > 0) {
          shareUrl = shareUrl.replace("{hashtags}", hashtags.join(","))
        } else {
          shareUrl = shareUrl.replace("&hashtags={hashtags}", "")
        }

        return NextResponse.json({
          success: true,
          share_url: shareUrl,
          platform_name: config.name,
        })
      }

      // Générer une carte de partage
      case "generate_card": {
        const {
          template_id,
          content_type,
          content_id,
          content_data,
        } = body

        if (!content_type || !content_data) {
          return NextResponse.json(
            { error: "content_type et content_data requis" },
            { status: 400 }
          )
        }

        // Ici on générerait l'image avec un service comme Cloudinary, Imgix, ou canvas côté serveur
        // Pour l'exemple, on simule la création

        const imageUrl = `/api/og/share-card?type=${content_type}&data=${encodeURIComponent(JSON.stringify(content_data))}`

        const { data: card, error } = await supabase
          .from("generated_share_cards")
          .insert({
            user_id: user.id,
            template_id,
            content_type,
            content_id,
            content_data,
            image_url: imageUrl,
          })
          .select()
          .single()

        if (error) throw error

        // Incrémenter le compteur d'utilisation du template
        if (template_id) {
          await supabase
            .from("share_card_templates")
            .update({ usage_count: supabase.rpc("increment", { x: 1 }) })
            .eq("id", template_id)
        }

        return NextResponse.json({
          success: true,
          card,
        })
      }

      // Désactiver un lien
      case "disable_link": {
        const { link_id } = body

        if (!link_id) {
          return NextResponse.json({ error: "link_id requis" }, { status: 400 })
        }

        const { error } = await supabase
          .from("share_links")
          .update({ is_active: false })
          .eq("id", link_id)
          .eq("user_id", user.id)

        if (error) throw error

        return NextResponse.json({ success: true })
      }

      // Préparer les données de partage pour un contenu
      case "prepare": {
        const { content_type, content_id } = body

        if (!content_type) {
          return NextResponse.json(
            { error: "content_type requis" },
            { status: 400 }
          )
        }

        // Récupérer les données selon le type
        let shareData: Record<string, unknown> = {}

        switch (content_type) {
          case "achievement": {
            const { data: badge } = await supabase
              .from("user_badges")
              .select(`
                *,
                badge:badges (*)
              `)
              .eq("id", content_id)
              .eq("user_id", user.id)
              .single()

            if (badge) {
              shareData = {
                title: `J'ai débloqué "${badge.badge.name}" sur TeensParty!`,
                description: badge.badge.description,
                image: badge.badge.icon_url,
                hashtags: ["TeensParty", "Achievement", "Gaming"],
              }
            }
            break
          }

          case "level_up": {
            const { data: userData } = await supabase
              .from("users")
              .select("level, display_name")
              .eq("id", user.id)
              .single()

            if (userData) {
              shareData = {
                title: `Je suis maintenant niveau ${userData.level} sur TeensParty!`,
                description: `${userData.display_name} a atteint le niveau ${userData.level}. Rejoins-moi!`,
                hashtags: ["TeensParty", "LevelUp", "Progress"],
              }
            }
            break
          }

          case "challenge": {
            const { data: challenge } = await supabase
              .from("user_challenges")
              .select(`
                *,
                challenge:physical_challenges (*)
              `)
              .eq("id", content_id)
              .eq("user_id", user.id)
              .single()

            if (challenge) {
              shareData = {
                title: `J'ai complété le défi "${challenge.challenge.title}"!`,
                description: challenge.challenge.description,
                hashtags: ["TeensParty", "Challenge", "Fitness"],
              }
            }
            break
          }

          case "creation": {
            const { data: creation } = await supabase
              .from("creations")
              .select("*")
              .eq("id", content_id)
              .eq("user_id", user.id)
              .single()

            if (creation) {
              shareData = {
                title: creation.title,
                description: creation.description,
                image: creation.media_url,
                hashtags: ["TeensParty", "Creation", "Art"],
              }
            }
            break
          }

          case "streak": {
            const { data: userData } = await supabase
              .from("users")
              .select("current_streak, display_name")
              .eq("id", user.id)
              .single()

            if (userData) {
              shareData = {
                title: `${userData.current_streak} jours de suite sur TeensParty!`,
                description: `${userData.display_name} maintient une série de ${userData.current_streak} jours. Incroyable!`,
                hashtags: ["TeensParty", "Streak", "Dedication"],
              }
            }
            break
          }

          case "profile": {
            const { data: userData } = await supabase
              .from("users")
              .select("*")
              .eq("id", user.id)
              .single()

            if (userData) {
              shareData = {
                title: `${userData.display_name} sur TeensParty`,
                description: `Niveau ${userData.level} • ${userData.total_xp} XP • Rejoins-moi sur TeensParty!`,
                image: userData.avatar_url,
                hashtags: ["TeensParty", "Profile"],
              }
            }
            break
          }

          default:
            shareData = {
              title: "Découvre TeensParty!",
              description: "La plateforme de gamification pour teens au Maroc",
              hashtags: ["TeensParty"],
            }
        }

        return NextResponse.json({
          success: true,
          share_data: shareData,
          platforms: Object.keys(PLATFORM_CONFIG),
        })
      }

      default:
        return NextResponse.json({ error: "Action invalide" }, { status: 400 })
    }
  } catch (error) {
    console.error("Share POST error:", error)
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
