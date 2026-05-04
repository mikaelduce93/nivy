import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// Common record types
export const RECORD_TYPES = [
  // Strength
  { id: "pushups", label: "Pompes", category: "strength", unit: "reps", icon: "dumbbell" },
  { id: "pullups", label: "Tractions", category: "strength", unit: "reps", icon: "dumbbell" },
  { id: "squats", label: "Squats", category: "strength", unit: "reps", icon: "dumbbell" },
  { id: "plank", label: "Planche", category: "strength", unit: "seconds", icon: "timer" },
  { id: "wall_sit", label: "Chaise", category: "strength", unit: "seconds", icon: "timer" },
  { id: "burpees", label: "Burpees", category: "strength", unit: "reps", icon: "flame" },

  // Cardio
  { id: "run_1k", label: "Course 1km", category: "cardio", unit: "minutes", icon: "run" },
  { id: "run_5k", label: "Course 5km", category: "cardio", unit: "minutes", icon: "run" },
  { id: "run_10k", label: "Course 10km", category: "cardio", unit: "minutes", icon: "run" },
  { id: "jump_rope", label: "Corde a sauter", category: "cardio", unit: "reps", icon: "activity" },
  { id: "jumping_jacks", label: "Jumping Jacks", category: "cardio", unit: "reps", icon: "activity" },

  // Flexibility
  { id: "splits", label: "Grand ecart", category: "flexibility", unit: "cm", icon: "stretch" },
  { id: "toe_touch", label: "Toucher orteils", category: "flexibility", unit: "cm", icon: "stretch" },

  // Sport specific
  { id: "sprint_100m", label: "Sprint 100m", category: "speed", unit: "seconds", icon: "zap" },
  { id: "long_jump", label: "Saut en longueur", category: "power", unit: "meters", icon: "move" },
  { id: "high_jump", label: "Saut en hauteur", category: "power", unit: "cm", icon: "trending-up" },
]

/**
 * GET /api/teen/sport/records
 * Fetch personal records for a teen
 *
 * Query params:
 * - teenId: UUID of the teen (required)
 * - category: Filter by category (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const teenId = searchParams.get("teenId")
    const category = searchParams.get("category")

    if (!teenId) {
      return NextResponse.json(
        { error: "teenId is required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get records
    let query = supabase
      .from("teen_personal_records")
      .select("*")
      .eq("teen_id", teenId)
      .order("achieved_at", { ascending: false })

    if (category) {
      query = query.eq("record_category", category)
    }

    const { data: records, error } = await query

    if (error) {
      console.error("Error fetching records:", error)
      return NextResponse.json(
        { error: "Failed to fetch records" },
        { status: 500 }
      )
    }

    // Get record history for trends
    const recordTypes = [...new Set(records?.map((r) => r.record_type) || [])]
    const recordHistory: Record<string, Array<{ value: number; date: string }>> = {}

    // For now, we only store the current record, but we could add a history table
    records?.forEach((r) => {
      if (!recordHistory[r.record_type]) {
        recordHistory[r.record_type] = []
      }
      recordHistory[r.record_type].push({
        value: r.value,
        date: r.achieved_at,
      })
      if (r.previous_value) {
        // Add previous value as a historical point
        recordHistory[r.record_type].push({
          value: r.previous_value,
          date: new Date(new Date(r.achieved_at).getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
      }
    })

    // Enrich records with type info
    const enrichedRecords = records?.map((record) => {
      const typeInfo = RECORD_TYPES.find((t) => t.id === record.record_type)
      return {
        ...record,
        type_info: typeInfo || {
          id: record.record_type,
          label: record.record_type,
          category: record.record_category,
          unit: record.unit,
          icon: "target",
        },
      }
    })

    // Calculate stats
    const stats = {
      total_records: records?.length || 0,
      recent_improvements: records?.filter((r) =>
        r.improvement_percent && r.improvement_percent > 0 &&
        new Date(r.achieved_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      ).length || 0,
      total_xp_earned: records?.reduce((sum, r) => sum + (r.xp_awarded || 0), 0) || 0,
      by_category: Object.entries(
        records?.reduce((acc, r) => {
          acc[r.record_category] = (acc[r.record_category] || 0) + 1
          return acc
        }, {} as Record<string, number>) || {}
      ).map(([category, count]) => ({ category, count })),
    }

    return NextResponse.json({
      success: true,
      records: enrichedRecords,
      recordTypes: RECORD_TYPES,
      history: recordHistory,
      stats,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/teen/sport/records
 * Add or update a personal record
 *
 * Body:
 * - teenId: UUID of the teen
 * - recordType: Type of record (from RECORD_TYPES)
 * - value: New record value
 * - proofUrl: URL of proof (optional)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teenId, recordType, value, proofUrl } = body

    if (!teenId || !recordType || value === undefined) {
      return NextResponse.json(
        { error: "teenId, recordType, and value are required" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get record type info
    const typeInfo = RECORD_TYPES.find((t) => t.id === recordType)
    if (!typeInfo) {
      return NextResponse.json(
        { error: "Invalid record type" },
        { status: 400 }
      )
    }

    // Get existing record
    const { data: existingRecord } = await supabase
      .from("teen_personal_records")
      .select("*")
      .eq("teen_id", teenId)
      .eq("record_type", recordType)
      .single()

    let isNewRecord = false
    let improvementPercent = 0
    let xpReward = 0

    if (existingRecord) {
      // Check if it's an improvement
      // For time-based records (lower is better), invert the comparison
      const isTimeBased = ["minutes", "seconds"].includes(typeInfo.unit)
      const isBetter = isTimeBased
        ? value < existingRecord.value
        : value > existingRecord.value

      if (!isBetter) {
        return NextResponse.json({
          success: true,
          message: "Pas un nouveau record",
          isNewRecord: false,
          currentRecord: existingRecord,
        })
      }

      isNewRecord = true
      if (isTimeBased) {
        improvementPercent = ((existingRecord.value - value) / existingRecord.value) * 100
      } else {
        improvementPercent = ((value - existingRecord.value) / existingRecord.value) * 100
      }

      // XP based on improvement
      if (improvementPercent >= 20) xpReward = 100
      else if (improvementPercent >= 10) xpReward = 75
      else if (improvementPercent >= 5) xpReward = 50
      else xpReward = 25

      // Update existing record
      const { data: updatedRecord, error } = await supabase
        .from("teen_personal_records")
        .update({
          value,
          previous_value: existingRecord.value,
          improvement_percent: improvementPercent,
          proof_url: proofUrl || existingRecord.proof_url,
          verified: false,
          xp_awarded: (existingRecord.xp_awarded || 0) + xpReward,
          achieved_at: new Date().toISOString(),
        })
        .eq("id", existingRecord.id)
        .select()
        .single()

      if (error) {
        console.error("Error updating record:", error)
        return NextResponse.json(
          { error: "Failed to update record" },
          { status: 500 }
        )
      }

      // Award XP
      if (xpReward > 0) {
        await supabase.rpc("add_xp_to_user", {
          p_teen_id: teenId,
          p_xp_amount: xpReward,
          p_source_type: "personal_record",
          p_source_id: updatedRecord.id,
          p_description: `Nouveau record: ${typeInfo.label} - ${value} ${typeInfo.unit}`,
        })
      }

      return NextResponse.json({
        success: true,
        message: "Nouveau record personnel!",
        isNewRecord: true,
        record: { ...updatedRecord, type_info: typeInfo },
        improvement: {
          previous: existingRecord.value,
          new: value,
          percent: improvementPercent,
        },
        xpEarned: xpReward,
      })
    } else {
      // First record of this type
      isNewRecord = true
      xpReward = 50 // Base XP for first record

      const { data: newRecord, error } = await supabase
        .from("teen_personal_records")
        .insert({
          teen_id: teenId,
          record_type: recordType,
          record_category: typeInfo.category,
          value,
          unit: typeInfo.unit,
          proof_url: proofUrl || null,
          verified: false,
          xp_awarded: xpReward,
          achieved_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        console.error("Error creating record:", error)
        return NextResponse.json(
          { error: "Failed to create record" },
          { status: 500 }
        )
      }

      // Award XP
      await supabase.rpc("add_xp_to_user", {
        p_teen_id: teenId,
        p_xp_amount: xpReward,
        p_source_type: "personal_record",
        p_source_id: newRecord.id,
        p_description: `Premier record: ${typeInfo.label} - ${value} ${typeInfo.unit}`,
      })

      return NextResponse.json({
        success: true,
        message: "Premier record enregistre!",
        isNewRecord: true,
        isFirstRecord: true,
        record: { ...newRecord, type_info: typeInfo },
        xpEarned: xpReward,
      })
    }
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
