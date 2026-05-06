"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export type ActionResult<T> = {
  success: boolean
  data?: T
  error?: string
}

/* ==========================================================================
   ACADEMIC PILLAR (SCHOOL)
   ========================================================================== */

export async function getAcademicData(teenId: string) {
  const supabase = await createClient()

  // 1. Get Quizzes
  const { data: quizzes } = await supabase
    .from("educational_quizzes")
    .select("*")
    .eq("is_active", true)

  // 2. Get User's Quiz Attempts (best score per quiz)
  const { data: attempts } = await supabase
    .from("quiz_attempts")
    .select("quiz_id, score, passed, xp_earned")
    .eq("teen_id", teenId)

  // Map attempts to quizzes
  const attemptMap = new Map()
  attempts?.forEach((a) => {
    const existing = attemptMap.get(a.quiz_id)
    if (!existing || a.score > existing.score) {
      attemptMap.set(a.quiz_id, a)
    }
  })

  // 3. Get Tutorials
  const { data: tutorials } = await supabase
    .from("educational_tutorials")
    .select("*")
    .eq("is_active", true)

  // 4. Get User's Tutorial Progress
  const { data: tutorialProgress } = await supabase
    .from("educational_tutorial_progress")
    .select("tutorial_id, completed, xp_earned")
    .eq("teen_id", teenId)

  const progressMap = new Map()
  tutorialProgress?.forEach((p) => progressMap.set(p.tutorial_id, p))

  // 5. Get Stats (from user_xp if columns exist, or calculate)
  const { data: userXp } = await supabase
    .from("user_xp")
    .select("school_score, total_xp") // Assuming total_xp holds global xp, we might need pillar specific if tracked separately or sum up
    .eq("teen_id", teenId)
    .single()

  // Calculate aggregations for the UI
  const quizzesCompleted = attempts?.filter((a) => a.passed).length || 0
  const videosWatched = tutorialProgress?.filter((p) => p.completed).length || 0
  
  // Calculate average quiz score
  const totalScore = attempts?.reduce((sum, a) => sum + a.score, 0) || 0
  const averageScore = attempts?.length ? Math.round(totalScore / attempts.length) : 0

  return {
    quizzes: quizzes?.map((q) => ({
      ...q,
      completed: attemptMap.get(q.id)?.passed || false,
      score: attemptMap.get(q.id)?.score,
    })) || [],
    tutorials: tutorials?.map((t) => ({
      ...t,
      completed: progressMap.get(t.id)?.completed || false,
    })) || [],
    stats: {
      schoolScore: userXp?.school_score || 50,
      quizzesCompleted,
      videosWatched,
      averageScore,
      totalXP: userXp?.total_xp || 0, // This is global XP, ideally we'd filter source='school' from xp_transactions
    },
  }
}

export async function submitGrade(teenId: string, data: {
  subject: string
  grade: number
  maxGrade: number
  type: string
  date: string
}): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient()
    
    // Check permissions/ownership handled by RLS if properly set, but here server-side:
    // Insert into teen_grades
    const { error } = await supabase.from("teen_grades").insert({
      teen_id: teenId,
      subject: data.subject,
      subject_label: data.subject, // Simplification
      grade: data.grade,
      max_grade: data.maxGrade,
      grade_type: data.type,
      grade_date: data.date,
      status: "pending", // Always pending validation
    })

    if (error) throw error

    revalidatePath("/teen/academic")
    return { success: true }
  } catch (error: any) {
    console.error("Error submitting grade:", error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   SPORT PILLAR
   ========================================================================== */

export async function getSportData(teenId: string) {
  const supabase = await createClient()

  // 1. Get Physical Challenges
  const { data: challenges } = await supabase
    .from("physical_challenges")
    .select("*")
    .eq("is_active", true)

  // 2. Get User Progress
  const { data: progress } = await supabase
    .from("teen_physical_challenge_progress")
    .select("challenge_id, completed, current_value, xp_earned")
    .eq("teen_id", teenId)

  const progressMap = new Map()
  progress?.forEach((p) => progressMap.set(p.challenge_id, p))

  // 3. Get Personal Records
  const { data: records } = await supabase
    .from("teen_personal_records")
    .select("*")
    .eq("teen_id", teenId)
    .order("value", { ascending: false }) // Or logic depending on unit (time vs count)

  // 4. Get Stats
  const { data: userXp } = await supabase
    .from("user_xp")
    .select("sport_score, total_xp")
    .eq("teen_id", teenId)
    .single()

  return {
    challenges: challenges?.map((c) => ({
      ...c,
      completed: progressMap.get(c.id)?.completed || false,
      progress: progressMap.get(c.id)?.current_value || 0,
    })) || [],
    records: records || [],
    stats: {
      sportScore: userXp?.sport_score || 50,
      challengesCompleted: progress?.filter(p => p.completed).length || 0,
      totalRecords: records?.length || 0,
      totalXP: userXp?.total_xp || 0, // Add totalXP
    }
  }
}

export async function submitChallengeResult(teenId: string, data: {
  challengeId: string
  value: number
}): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient()

    // 1. Get challenge details for target
    const { data: challenge } = await supabase
      .from("physical_challenges")
      .select("*")
      .eq("id", data.challengeId)
      .single()

    if (!challenge) throw new Error("Challenge not found")

    // 2. Check if completed
    // Logic depends on objective_type (count/distance/weight: >=, duration: >= usually but speed is <=)
    // Simplifying assumption: bigger is better for count/distance, smaller better for speed duration?
    // Based on migration: 'objective_type' IN ('count', 'duration', 'distance', 'weight')
    // Let's assume >= target is success for now unless specified
    const completed = data.value >= challenge.objective_value 

    // 3. Upsert progress
    const { error: progressError } = await supabase
      .from("teen_physical_challenge_progress")
      .upsert({
        teen_id: teenId,
        challenge_id: data.challengeId,
        current_value: data.value,
        completed: completed,
        completed_at: completed ? new Date().toISOString() : null,
        objective_value: challenge.objective_value, // Snapshot target
        xp_earned: completed ? challenge.xp_reward : 0 // Should only award once ideally
      }, { onConflict: 'teen_id, challenge_id' })

    if (progressError) throw progressError

    // 4. Update Personal Record if better
    // Need to know record_type mapped to challenge or generic
    // For simplicity, we create a record with record_type = challenge.code
    
    // Check existing record
    const { data: existingRecord } = await supabase
        .from("teen_personal_records")
        .select("value")
        .eq("teen_id", teenId)
        .eq("record_type", challenge.code)
        .single()

    const isNewRecord = !existingRecord || data.value > existingRecord.value // Assuming bigger is better

    if (isNewRecord) {
        await supabase.from("teen_personal_records").upsert({
            teen_id: teenId,
            record_type: challenge.code,
            record_category: challenge.sport_category,
            value: data.value,
            unit: challenge.objective_unit || "",
            previous_value: existingRecord?.value,
            improvement_percent: existingRecord ? ((data.value - existingRecord.value) / existingRecord.value) * 100 : 100,
            achieved_at: new Date().toISOString()
        }, { onConflict: 'teen_id, record_type'})
    }

    revalidatePath("/teen/challenges")
    return { success: true }
  } catch (error: any) {
    console.error("Error submitting challenge:", error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   CREA PILLAR
   ========================================================================== */

export async function getCreaData(teenId: string) {
  const supabase = await createClient()

  // 1. Get Passion Paths
  const { data: paths } = await supabase
    .from("passion_paths")
    .select("*")
    .eq("is_active", true)

  // 2. Get User Path Progress
  const { data: pathProgress } = await supabase
    .from("teen_passion_path_progress")
    .select("path_id, current_level, level_progress_percent, completed")
    .eq("teen_id", teenId)

  const pathMap = new Map()
  pathProgress?.forEach((p) => pathMap.set(p.path_id, p))

  // 3. Get Tutorials (all or filtered) - Fetching all active for now
  const { data: tutorials } = await supabase
    .from("passion_tutorials")
    .select("*")
    .eq("is_active", true)

  // 4. Get User Tutorial Progress
  const { data: tutorialProgress } = await supabase
    .from("passion_tutorial_progress")
    .select("tutorial_id, completed")
    .eq("teen_id", teenId)

  const tutoMap = new Map()
  tutorialProgress?.forEach((t) => tutoMap.set(t.tutorial_id, t))

  // 5. Get User Creations
  const { data: creations } = await supabase
    .from("teen_creations")
    .select("*")
    .eq("teen_id", teenId)
    .order("created_at", { ascending: false })

  // 6. Stats
  const { data: userXp } = await supabase
    .from("user_xp")
    .select("crea_score")
    .eq("teen_id", teenId)
    .single()

  return {
    paths: paths?.map((p) => ({
      ...p,
      progress: pathMap.get(p.id)?.level_progress_percent || 0,
      currentLevel: pathMap.get(p.id)?.current_level || 1,
      unlocked: true, // Logic for unlocking could be added
    })) || [],
    tutorials: tutorials?.map((t) => ({
      ...t,
      completed: tutoMap.get(t.id)?.completed || false,
    })) || [],
    creations: creations || [],
    stats: {
      creaScore: userXp?.crea_score || 50,
      creationsCount: creations?.length || 0,
      tutorialsCompleted: tutorialProgress?.filter(t => t.completed).length || 0
    }
  }
}

export async function uploadCreation(teenId: string, data: {
  title: string
  description: string
  pathId: string
  type: string
  // In a real app, mediaUrl would come from storage upload
}): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.from("teen_creations").insert({
      teen_id: teenId,
      title: data.title,
      description: data.description,
      category: "general", // Or derive from path
      media_type: data.type,
      media_url: "https://placeholder.com/media", // Placeholder
      path_id: data.pathId,
      visibility: "public"
    })

    if (error) throw error

    revalidatePath("/teen/passions")
    return { success: true }
  } catch (error: any) {
    console.error("Error uploading creation:", error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   SETTINGS
   ========================================================================== */

export async function updatePrivacySettings(teenId: string, settings: Record<string, boolean>): Promise<ActionResult<any>> {
  try {
    const supabase = await createClient()

    // Get current settings first
    const { data: current, error: fetchError } = await supabase
      .from("teen_profiles")
      .select("privacy_settings")
      .eq("profile_id", teenId)
      .single()

    if (fetchError) throw fetchError

    const newSettings = {
      ...(current.privacy_settings || {}),
      ...settings
    }

    const { error } = await supabase
      .from("teen_profiles")
      .update({ privacy_settings: newSettings })
      .eq("profile_id", teenId)

    if (error) throw error

    revalidatePath("/teen/settings")
    return { success: true }
  } catch (error: any) {
    console.error("Error updating privacy settings:", error)
    return { success: false, error: error.message }
  }
}

/* ==========================================================================
   COINS
   ========================================================================== */

export async function getCoinsTransactions(teenId: string, offset: number = 0, limit: number = 10) {
  const supabase = await createClient()
  
  const { data: transactions } = await supabase
    .from("coin_transactions")
    .select("*")
    .eq("teen_id", teenId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  return transactions || []
}
