/**
 * Simple Queue System
 * ===================
 * Database-backed job queue for async tasks
 *
 * Can be upgraded to Bull/BullMQ for Redis-based queuing in production
 *
 * Usage:
 * import { queue, JobType } from '@/lib/queue'
 *
 * // Enqueue a job
 * await queue.enqueue('send_email', { to: 'user@example.com', template: 'welcome' })
 *
 * // Process jobs (in a cron/worker)
 * await queue.processJobs('send_email', handleEmail)
 */

import { createServiceRoleClient } from "@/lib/supabase/service-role"

// Job types
export type JobType =
  | "send_email"
  | "send_notification"
  | "generate_pdf"
  | "calculate_leaderboard"
  | "calculate_stats"
  | "sync_external"
  | "cleanup"

// Job status
export type JobStatus = "pending" | "processing" | "completed" | "failed" | "retrying"

// Job priority
export type JobPriority = "low" | "normal" | "high" | "critical"

// Job definition
export interface Job<T = any> {
  id: string
  type: JobType
  payload: T
  status: JobStatus
  priority: JobPriority
  attempts: number
  maxAttempts: number
  lastError?: string
  scheduledAt?: string
  startedAt?: string
  completedAt?: string
  createdAt: string
}

// Queue configuration
const QUEUE_CONFIG = {
  maxAttempts: 3,
  retryDelay: 60, // seconds
  lockTimeout: 300, // seconds
  batchSize: 10,
}

/**
 * Queue class for job management
 */
class JobQueue {
  /**
   * Enqueue a new job
   */
  async enqueue<T>(
    type: JobType,
    payload: T,
    options: {
      priority?: JobPriority
      scheduledAt?: Date
      maxAttempts?: number
    } = {}
  ): Promise<string> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("job_queue")
      .insert({
        type,
        payload,
        status: "pending",
        priority: options.priority || "normal",
        attempts: 0,
        max_attempts: options.maxAttempts || QUEUE_CONFIG.maxAttempts,
        scheduled_at: options.scheduledAt?.toISOString() || new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("[Queue] Failed to enqueue job:", error)
      throw new Error(`Failed to enqueue job: ${error.message}`)
    }

    console.log(`[Queue] Job enqueued: ${type} (${data.id})`)
    return data.id
  }

  /**
   * Enqueue multiple jobs in batch
   */
  async enqueueBatch<T>(
    jobs: Array<{
      type: JobType
      payload: T
      priority?: JobPriority
    }>
  ): Promise<string[]> {
    const supabase = createServiceRoleClient()

    const jobRecords = jobs.map((job) => ({
      type: job.type,
      payload: job.payload,
      status: "pending" as JobStatus,
      priority: job.priority || "normal",
      attempts: 0,
      max_attempts: QUEUE_CONFIG.maxAttempts,
      scheduled_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("job_queue")
      .insert(jobRecords)
      .select("id")

    if (error) {
      console.error("[Queue] Failed to enqueue batch:", error)
      throw new Error(`Failed to enqueue batch: ${error.message}`)
    }

    return data.map((d) => d.id)
  }

  /**
   * Process pending jobs of a specific type
   */
  async processJobs<T>(
    type: JobType,
    handler: (job: Job<T>) => Promise<void>,
    options: {
      batchSize?: number
      lockTimeout?: number
    } = {}
  ): Promise<{ processed: number; failed: number }> {
    const supabase = createServiceRoleClient()
    const batchSize = options.batchSize || QUEUE_CONFIG.batchSize
    const lockTimeout = options.lockTimeout || QUEUE_CONFIG.lockTimeout

    let processed = 0
    let failed = 0

    // Get pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from("job_queue")
      .select("*")
      .eq("type", type)
      .in("status", ["pending", "retrying"])
      .lte("scheduled_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(batchSize)

    if (fetchError) {
      console.error("[Queue] Failed to fetch jobs:", fetchError)
      return { processed, failed }
    }

    if (!jobs || jobs.length === 0) {
      return { processed, failed }
    }

    // Process each job
    for (const jobData of jobs) {
      const job: Job<T> = {
        id: jobData.id,
        type: jobData.type,
        payload: jobData.payload,
        status: jobData.status,
        priority: jobData.priority,
        attempts: jobData.attempts,
        maxAttempts: jobData.max_attempts,
        lastError: jobData.last_error,
        scheduledAt: jobData.scheduled_at,
        startedAt: jobData.started_at,
        completedAt: jobData.completed_at,
        createdAt: jobData.created_at,
      }

      try {
        // Mark job as processing
        await supabase
          .from("job_queue")
          .update({
            status: "processing",
            started_at: new Date().toISOString(),
            attempts: job.attempts + 1,
          })
          .eq("id", job.id)

        // Execute handler
        await handler(job)

        // Mark job as completed
        await supabase
          .from("job_queue")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("id", job.id)

        processed++
        console.log(`[Queue] Job completed: ${job.type} (${job.id})`)
      } catch (error: any) {
        const errorMessage = error.message || "Unknown error"
        console.error(`[Queue] Job failed: ${job.type} (${job.id})`, error)

        // Check if should retry
        const shouldRetry = job.attempts + 1 < job.maxAttempts

        await supabase
          .from("job_queue")
          .update({
            status: shouldRetry ? "retrying" : "failed",
            last_error: errorMessage,
            scheduled_at: shouldRetry
              ? new Date(Date.now() + QUEUE_CONFIG.retryDelay * 1000).toISOString()
              : undefined,
          })
          .eq("id", job.id)

        failed++
      }
    }

    return { processed, failed }
  }

  /**
   * Get job by ID
   */
  async getJob(id: string): Promise<Job | null> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("job_queue")
      .select("*")
      .eq("id", id)
      .single()

    if (error || !data) {
      return null
    }

    return {
      id: data.id,
      type: data.type,
      payload: data.payload,
      status: data.status,
      priority: data.priority,
      attempts: data.attempts,
      maxAttempts: data.max_attempts,
      lastError: data.last_error,
      scheduledAt: data.scheduled_at,
      startedAt: data.started_at,
      completedAt: data.completed_at,
      createdAt: data.created_at,
    }
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number
    processing: number
    completed: number
    failed: number
    retrying: number
    byType: Record<JobType, number>
  }> {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from("job_queue")
      .select("status, type")

    if (error || !data) {
      return {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        retrying: 0,
        byType: {} as Record<JobType, number>,
      }
    }

    const stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
      byType: {} as Record<JobType, number>,
    }

    data.forEach((job) => {
      stats[job.status as keyof typeof stats]++
      if (!stats.byType[job.type as JobType]) {
        stats.byType[job.type as JobType] = 0
      }
      stats.byType[job.type as JobType]++
    })

    return stats
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanup(olderThanDays: number = 7): Promise<number> {
    const supabase = createServiceRoleClient()

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays)

    const { data, error } = await supabase
      .from("job_queue")
      .delete()
      .in("status", ["completed", "failed"])
      .lt("completed_at", cutoffDate.toISOString())
      .select("id")

    const count = data?.length || 0

    if (error) {
      console.error("[Queue] Cleanup failed:", error)
      return 0
    }

    console.log(`[Queue] Cleaned up ${count} old jobs`)
    return count || 0
  }

  /**
   * Cancel a pending job
   */
  async cancel(id: string): Promise<boolean> {
    const supabase = createServiceRoleClient()

    const { error } = await supabase
      .from("job_queue")
      .delete()
      .eq("id", id)
      .eq("status", "pending")

    return !error
  }
}

// Export singleton
export const queue = new JobQueue()

/**
 * Job handlers registry
 * Register handlers for different job types
 */
export const jobHandlers: Partial<Record<JobType, (job: Job) => Promise<void>>> = {}

/**
 * Register a job handler
 */
export function registerHandler(
  type: JobType,
  handler: (job: Job) => Promise<void>
): void {
  jobHandlers[type] = handler
}

/**
 * Convenience functions for common job types
 */
export const queueEmail = (
  to: string,
  template: string,
  data: Record<string, any>,
  priority?: JobPriority
) => queue.enqueue("send_email", { to, template, data }, { priority })

export const queueNotification = (
  userId: string,
  type: string,
  data: Record<string, any>,
  priority?: JobPriority
) => queue.enqueue("send_notification", { userId, type, data }, { priority })

export const queuePDFGeneration = (
  type: string,
  userId: string,
  params: Record<string, any>
) => queue.enqueue("generate_pdf", { type, userId, params })

export default queue
