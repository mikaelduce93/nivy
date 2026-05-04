"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
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
      p_parent_id: parentId || null,
    })

    if (error) throw error

    const { data: commentData } = await supabase
      .from("activity_comments")
      .select(
        `
        *,
        users!inner(id, username, avatar_url)
      `
      )
      .eq("id", data.id)
      .single()

    const comment: CommentWithUser = {
      ...commentData,
      user: commentData.users,
    }

    revalidatePath("/feed")

    return { success: true, comment }
  } catch (error) {
    console.error("Erreur addActivityComment:", error)
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
      .select(
        `
        *,
        users!inner(id, username, avatar_url)
      `
      )
      .eq("activity_id", activityId)
      .eq("is_hidden", false)
      .order("created_at", { ascending: true })

    if (error) throw error

    const commentsMap = new Map<string, CommentWithUser>()
    const rootComments: CommentWithUser[] = []

    data.forEach((c: any) => {
      const comment: CommentWithUser = {
        ...c,
        user: c.users,
        replies: [],
      }
      commentsMap.set(c.id, comment)
    })

    data.forEach((c: any) => {
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
    console.error("Erreur getActivityComments:", error)
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
    console.error("Erreur editActivityComment:", error)
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
    console.error("Erreur deleteActivityComment:", error)
    return { success: false, error: "Impossible de supprimer le commentaire" }
  }
}
