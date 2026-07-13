"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { logDbError } from "@/lib/observability/log-db-error"
import { resolveTeenIdentities } from "@/lib/server/teen-identities"
import { type CommentWithUser } from "../schema"

/**
 * Ajoute un commentaire
 */
export async function addActivityComment(
  activityId: string,
  content: string,
  parentId?: string
): Promise<{
  success: boolean
  comment?: CommentWithUser
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    if (!content.trim()) {
      return { success: false, error: "Le commentaire ne peut pas être vide" }
    }

    const { data, error } = await supabase.rpc("add_activity_comment", {
      p_activity_id: activityId,
      p_user_id: user.id,
      p_content: content.trim(),
      p_parent_id: parentId || undefined,
    })

    if (error) throw error

    // La RPC (RETURNS JSON) renvoie { comment_id, count } — cast de frontière.
    const created = data as { comment_id: string; count: number } | null
    if (!created?.comment_id) throw new Error("add_activity_comment: réponse invalide")

    const { data: commentData } = await supabase
      .from("activity_comments")
      .select("*")
      .eq("id", created.comment_id)
      .single()

    if (!commentData) throw new Error("Commentaire introuvable après création")

    // Aucune FK activity_comments -> users, et `users` ne porte ni pseudo ni avatar :
    // on résout l'identité applicativement (teens/user_xp/profiles).
    const identities = await resolveTeenIdentities(supabase, [commentData.user_id])
    const identity = identities.get(commentData.user_id)

    const comment: CommentWithUser = {
      id: commentData.id,
      activity_id: commentData.activity_id,
      user_id: commentData.user_id,
      parent_id: commentData.parent_id,
      content: commentData.content,
      is_edited: commentData.is_edited ?? false,
      is_hidden: commentData.is_hidden ?? false,
      created_at: commentData.created_at ?? undefined,
      updated_at: commentData.updated_at ?? undefined,
      user: {
        id: commentData.user_id,
        username: identity?.pseudo ?? "Utilisateur",
        avatar_url: identity?.avatar_url ?? undefined,
      },
    }

    revalidatePath("/feed")

    return { success: true, comment }
  } catch (error) {
    logDbError("activity-feed.addActivityComment", error)
    return { success: false, error: "Impossible d'ajouter le commentaire" }
  }
}

/**
 * Récupère les commentaires d'une activité
 */
export async function getActivityComments(activityId: string): Promise<{
  success: boolean
  comments?: CommentWithUser[]
  error?: string
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("activity_comments")
      .select("*")
      .eq("activity_id", activityId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })

    if (error) throw error
    if (!data) return { success: true, comments: [] }

    // Aucune FK activity_comments -> users : identité résolue applicativement.
    const identities = await resolveTeenIdentities(
      supabase,
      data.map((c) => c.user_id)
    )

    const commentsMap = new Map<string, CommentWithUser>()
    const rootComments: CommentWithUser[] = []

    data.forEach((c) => {
      const identity = identities.get(c.user_id)
      const comment: CommentWithUser = {
        id: c.id,
        activity_id: c.activity_id,
        user_id: c.user_id,
        parent_id: c.parent_id,
        content: c.content,
        is_edited: c.is_edited ?? false,
        is_hidden: c.is_hidden ?? false,
        created_at: c.created_at ?? undefined,
        updated_at: c.updated_at ?? undefined,
        user: {
          id: c.user_id,
          username: identity?.pseudo ?? "Utilisateur",
          avatar_url: identity?.avatar_url ?? undefined,
        },
        replies: [],
      }
      commentsMap.set(c.id, comment)
    })

    data.forEach((c) => {
      const comment = commentsMap.get(c.id)!
      if (c.parent_id) {
        const parent = commentsMap.get(c.parent_id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(comment)
        }
      } else {
        rootComments.push(comment)
      }
    })

    return { success: true, comments: rootComments }
  } catch (error) {
    logDbError("activity-feed.getActivityComments", error)
    return { success: false, error: "Impossible de charger les commentaires" }
  }
}

/**
 * Modifie un commentaire
 */
export async function editActivityComment(
  commentId: string,
  content: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    if (!content.trim()) {
      return { success: false, error: "Le commentaire ne peut pas être vide" }
    }

    const { error } = await supabase
      .from("activity_comments")
      .update({
        content: content.trim(),
        is_edited: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/feed")

    return { success: true }
  } catch (error) {
    logDbError("activity-feed.editActivityComment", error)
    return { success: false, error: "Impossible de modifier le commentaire" }
  }
}

/**
 * Supprime un commentaire
 */
export async function deleteActivityComment(commentId: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { success: false, error: "Non authentifié" }
    }

    const { error } = await supabase
      .from("activity_comments")
      .update({
        is_hidden: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", commentId)
      .eq("user_id", user.id)

    if (error) throw error

    revalidatePath("/feed")

    return { success: true }
  } catch (error) {
    logDbError("activity-feed.deleteActivityComment", error)
    return { success: false, error: "Impossible de supprimer le commentaire" }
  }
}
