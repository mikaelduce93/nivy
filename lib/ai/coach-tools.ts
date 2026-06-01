import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { AIToolDef, AIToolResult } from "./providers/base"

/**
 * #212 Coach Niv — tools agentiques fiables (closed loop).
 *
 * Executors sous le client RLS du teen (jamais service-role pour une écriture
 * auto). Règles dures :
 *  - JAMAIS de conversion/transfert XP <-> DH.
 *  - Aucun faux succès : en cas d'erreur Supabase, success=false + message honnête.
 *  - Tools sensibles (open_savings_goal, book_event) = on crée une ligne
 *    parental_approvals "pending" (confirmation parentale), AUCUNE écriture
 *    immédiate de la ressource.
 *
 * Schéma vérifié en live (projet imchornjvmgmaovhypco) :
 *  - add_xp_to_user(p_teen_id, p_xp_amount, p_source_type, p_source_category, p_source_id, p_description)
 *  - recommend_for_teen(p_teen_id, p_content_type, p_n, p_language)
 *  - parent_chore_completions(chore_id, teen_id, completed_at, evidence_url, parent_verified)
 *  - parental_approvals(parent_id, teen_id, action_type, resource_type, resource_id, amount, details, status, expires_at)
 */

export interface CoachToolContext {
  teenId: string
  parentId?: string
}

export interface CoachTools {
  defs: AIToolDef[]
  execute: (name: string, input: Record<string, unknown>) => Promise<AIToolResult>
}

const APPROVAL_TTL_MS = 7 * 24 * 60 * 60 * 1000

type RecommendRow = { id?: string; content_type?: string }

function parseRecommendRows(data: unknown): RecommendRow[] {
  if (!Array.isArray(data)) return []
  return data
    .map((row) => {
      if (typeof row === "string") {
        try {
          return JSON.parse(row) as RecommendRow
        } catch {
          return null
        }
      }
      if (row && typeof row === "object") return row as RecommendRow
      return null
    })
    .filter((r): r is RecommendRow => !!r && typeof r.id === "string")
}

function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.slice(0, max).trim() : ""
}

export function buildCoachTools(supabase: SupabaseClient, ctx: CoachToolContext): CoachTools {
  const defs: AIToolDef[] = [
    {
      name: "start_quiz",
      description:
        "Propose et prépare le quiz du jour le plus pertinent. À utiliser quand l'ado veut jouer, réviser, ou demande quoi faire maintenant.",
      input_schema: { type: "object", properties: {} },
    },
    {
      name: "check_in",
      description:
        "Valide un check-in dans un lieu et crédite des XP de mérite. À utiliser quand l'ado dit qu'il est arrivé/présent quelque part. Ne convertit jamais en argent.",
      input_schema: {
        type: "object",
        properties: {
          venueName: { type: "string", description: "Nom du lieu" },
          xpReward: { type: "number", description: "XP (défaut 50, max 200)" },
        },
        required: ["venueName"],
      },
    },
    {
      name: "complete_chore",
      description:
        "Soumet une corvée parent comme terminée (en attente de validation du parent — pas de récompense immédiate). À utiliser quand l'ado dit avoir fini une corvée.",
      input_schema: {
        type: "object",
        properties: { choreId: { type: "string", description: "id de la corvée" } },
        required: ["choreId"],
      },
    },
    {
      name: "open_savings_goal",
      description:
        "Demande l'ouverture d'un objectif d'épargne en coins. ACTION SENSIBLE : nécessite la validation d'un parent (aucune création immédiate).",
      input_schema: {
        type: "object",
        properties: {
          title: { type: "string", description: "Nom de l'objectif" },
          targetCoins: { type: "number", description: "Objectif en coins (>0)" },
          description: { type: "string" },
        },
        required: ["title", "targetCoins"],
      },
    },
    {
      name: "book_event",
      description:
        "Demande la réservation d'un événement. ACTION SENSIBLE : nécessite la validation d'un parent (aucun débit direct, jamais de conversion XP/argent).",
      input_schema: {
        type: "object",
        properties: {
          eventId: { type: "string" },
          price: { type: "number", description: "Prix en DH" },
        },
        required: ["eventId", "price"],
      },
    },
  ]

  const execute = async (name: string, input: Record<string, unknown>): Promise<AIToolResult> => {
    switch (name) {
      case "start_quiz": {
        const { data, error } = await supabase.rpc("recommend_for_teen", {
          p_teen_id: ctx.teenId,
          p_content_type: "quiz",
          p_n: 1,
        })
        if (error) return { success: false, message: "Je n'arrive pas à charger un quiz là, réessaie." }
        const top = parseRecommendRows(data)[0]
        if (!top?.id) return { success: false, message: "Aucun quiz dispo pour le moment." }
        const { data: quiz } = await supabase
          .from("educational_quizzes")
          .select("id, title")
          .eq("id", top.id)
          .eq("is_active", true)
          .maybeSingle<{ id: string; title: string | null }>()
        if (!quiz?.id) return { success: false, message: "Le quiz suggéré n'est plus dispo." }
        return {
          success: true,
          message: `Quiz prêt : ${quiz.title ?? "Quiz du jour"}`,
          data: { quizId: quiz.id, title: quiz.title, href: `/teen/quiz/${quiz.id}` },
        }
      }

      case "check_in": {
        const venueName = str(input.venueName, 80)
        if (!venueName) return { success: false, message: "Il me faut le nom du lieu." }
        const rawXp = Number(input.xpReward)
        const xp = Number.isFinite(rawXp) ? Math.min(200, Math.max(0, Math.round(rawXp))) : 50
        const { error } = await supabase.rpc("add_xp_to_user", {
          p_teen_id: ctx.teenId,
          p_xp_amount: xp,
          p_source_type: "check_in",
          p_source_category: "check_in",
          p_source_id: null,
          p_description: `Check-in ${venueName}`,
        })
        if (error) return { success: false, message: "Le check-in n'a pas pu être validé." }
        return { success: true, message: `Check-in validé à ${venueName} (+${xp} XP) !`, data: { xp } }
      }

      case "complete_chore": {
        const choreId = str(input.choreId, 64)
        if (!choreId) return { success: false, message: "Quelle corvée veux-tu valider ?" }
        const { data: chore } = await supabase
          .from("parent_chores")
          .select("id, teen_id, title, evidence_required, is_active")
          .eq("id", choreId)
          .maybeSingle<{
            id: string
            teen_id: string
            title: string
            evidence_required: boolean
            is_active: boolean
          }>()
        let assigned = chore?.teen_id === ctx.teenId
        if (chore && !assigned) {
          const { data: tgt } = await supabase
            .from("chore_targets")
            .select("chore_id")
            .eq("chore_id", choreId)
            .eq("teen_id", ctx.teenId)
            .maybeSingle()
          assigned = Boolean(tgt)
        }
        if (!chore || !chore.is_active || !assigned) {
          return { success: false, message: "Cette corvée ne t'est pas attribuée." }
        }
        if (chore.evidence_required) {
          return {
            success: false,
            message: "Cette corvée demande une preuve (photo). Ajoute-la depuis l'écran Corvées.",
          }
        }
        const { error } = await supabase.from("parent_chore_completions").insert({
          chore_id: choreId,
          teen_id: ctx.teenId,
          completed_at: new Date().toISOString(),
          evidence_url: null,
          parent_verified: false,
        })
        if (error) return { success: false, message: "Impossible de soumettre la corvée." }
        return {
          success: true,
          message: `Corvée « ${chore.title} » soumise — en attente de validation de ton parent.`,
          data: { choreId },
        }
      }

      case "open_savings_goal": {
        if (!ctx.parentId) {
          return { success: false, message: "Je n'ai pas trouvé ton parent pour valider — réessaie plus tard." }
        }
        const title = str(input.title, 80)
        const targetCoins = Math.round(Number(input.targetCoins))
        if (!title || !Number.isFinite(targetCoins) || targetCoins <= 0) {
          return { success: false, message: "Il me faut un nom et un objectif en coins (> 0)." }
        }
        const description = str(input.description, 200) || null
        const { error } = await supabase.from("parental_approvals").insert({
          parent_id: ctx.parentId,
          teen_id: ctx.teenId,
          action_type: "savings_goal",
          resource_type: "savings_goal",
          resource_id: null,
          amount: targetCoins,
          details: { title, description, target_coins: targetCoins },
          status: "pending",
          expires_at: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(),
        })
        if (error) return { success: false, message: "La demande d'épargne n'a pas pu être envoyée." }
        return {
          success: true,
          pendingApproval: true,
          message: `J'ai envoyé la demande d'épargne « ${title} » à ton parent ✋`,
          data: { title, targetCoins },
        }
      }

      case "book_event": {
        if (!ctx.parentId) {
          return { success: false, message: "Je n'ai pas trouvé ton parent pour valider la réservation." }
        }
        const eventId = str(input.eventId, 64)
        const price = Number(input.price)
        if (!eventId || !Number.isFinite(price) || price < 0) {
          return { success: false, message: "Il me faut l'événement et le prix." }
        }
        const { error } = await supabase.from("parental_approvals").insert({
          parent_id: ctx.parentId,
          teen_id: ctx.teenId,
          action_type: "event_booking",
          resource_type: "event",
          resource_id: eventId,
          amount: price,
          details: { event_id: eventId, price },
          status: "pending",
          expires_at: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(),
        })
        if (error) return { success: false, message: "La demande de réservation n'a pas pu être envoyée." }
        return {
          success: true,
          pendingApproval: true,
          message: "J'ai envoyé la demande de réservation à ton parent ✋",
          data: { eventId, price },
        }
      }

      default:
        return { success: false, message: "Action inconnue." }
    }
  }

  return { defs, execute }
}
