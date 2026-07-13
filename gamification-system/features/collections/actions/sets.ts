"use server"

import { createClient } from "@/lib/supabase/server"
import { logDbError } from "@/lib/observability/log-db-error"
import { type CollectionSet } from "../schema"

/**
 * Récupérer tous les sets de collection actifs
 */
export async function getCollectionSets(): Promise<CollectionSet[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("collection_sets")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })

  if (error) {
    logDbError("collections.getCollectionSets", error)
    return []
  }

  // Frontière : les colonnes live sont typées nullable / set_type string,
  // mais elles ont des défauts DB et correspondent au type domaine CollectionSet.
  return (data || []) as CollectionSet[]
}

/**
 * Récupérer un set par son slug
 */
export async function getCollectionSetBySlug(
  slug: string
): Promise<CollectionSet | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("collection_sets")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single()

  if (error) {
    logDbError("collections.getCollectionSetBySlug", error)
    return null
  }

  return data as CollectionSet
}

/**
 * Récupérer les sets disponibles actuellement (non expirés)
 */
export async function getAvailableSets(): Promise<CollectionSet[]> {
  const supabase = await createClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from("collection_sets")
    .select("*")
    .eq("is_active", true)
    .or(`available_from.is.null,available_from.lte.${now}`)
    .or(`available_until.is.null,available_until.gte.${now}`)
    .order("is_limited", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    logDbError("collections.getAvailableSets", error)
    return []
  }

  return (data || []) as CollectionSet[]
}
