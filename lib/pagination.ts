/**
 * Pagination Utilities
 * ====================
 * Reusable pagination helpers for API routes
 */

import { NextRequest } from "next/server"

// Default pagination settings
export const DEFAULT_PAGE_SIZE = 20
export const MAX_PAGE_SIZE = 100
export const LEADERBOARD_PAGE_SIZE = 50

/**
 * Pagination parameters extracted from request
 */
export interface PaginationParams {
  page: number
  limit: number
  offset: number
  sort?: string
  order?: "asc" | "desc"
}

/**
 * Pagination metadata to return in API response
 */
export interface PaginationMeta {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
  nextPage: number | null
  prevPage: number | null
}

/**
 * Extract pagination parameters from request URL
 */
export function getPaginationParams(
  request: NextRequest,
  defaultLimit: number = DEFAULT_PAGE_SIZE
): PaginationParams {
  const { searchParams } = new URL(request.url)

  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  let limit = parseInt(searchParams.get("limit") || String(defaultLimit))

  // Enforce max limit
  limit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE)

  const offset = (page - 1) * limit

  const sort = searchParams.get("sort") || undefined
  const order = (searchParams.get("order") || "desc") as "asc" | "desc"

  return { page, limit, offset, sort, order }
}

/**
 * Calculate pagination metadata from query results
 */
export function getPaginationMeta(
  total: number,
  page: number,
  limit: number
): PaginationMeta {
  const totalPages = Math.ceil(total / limit)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage: hasNextPage ? page + 1 : null,
    prevPage: hasPrevPage ? page - 1 : null,
  }
}

/**
 * Format paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  total: number,
  params: PaginationParams
): {
  data: T[]
  pagination: PaginationMeta
} {
  return {
    data,
    pagination: getPaginationMeta(total, params.page, params.limit),
  }
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  cursor?: string
  limit: number
  direction: "forward" | "backward"
}

/**
 * Cursor-based pagination metadata
 */
export interface CursorPaginationMeta {
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
  limit: number
}

/**
 * Extract cursor pagination parameters from request
 */
export function getCursorPaginationParams(
  request: NextRequest,
  defaultLimit: number = DEFAULT_PAGE_SIZE
): CursorPaginationParams {
  const { searchParams } = new URL(request.url)

  const cursor = searchParams.get("cursor") || undefined
  let limit = parseInt(searchParams.get("limit") || String(defaultLimit))
  limit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE)

  const direction = (searchParams.get("direction") || "forward") as
    | "forward"
    | "backward"

  return { cursor, limit, direction }
}

/**
 * Format cursor-paginated response
 */
export function cursorPaginatedResponse<T extends { id: string }>(
  data: T[],
  params: CursorPaginationParams,
  hasMore: boolean
): {
  data: T[]
  pagination: CursorPaginationMeta
} {
  const nextCursor = hasMore && data.length > 0 ? data[data.length - 1].id : null
  const prevCursor = params.cursor && data.length > 0 ? data[0].id : null

  return {
    data,
    pagination: {
      nextCursor,
      prevCursor,
      hasMore,
      limit: params.limit,
    },
  }
}

/**
 * Apply Supabase range for offset pagination
 */
export function applyRange(query: any, params: PaginationParams) {
  return query.range(params.offset, params.offset + params.limit - 1)
}

/**
 * Apply sorting to Supabase query
 */
export function applySorting(
  query: any,
  params: PaginationParams,
  defaultSort: string = "created_at",
  allowedSorts: string[] = []
) {
  const sortField =
    params.sort && allowedSorts.includes(params.sort)
      ? params.sort
      : defaultSort

  return query.order(sortField, { ascending: params.order === "asc" })
}

/**
 * Build pagination links for API response
 */
export function buildPaginationLinks(
  baseUrl: string,
  meta: PaginationMeta
): {
  self: string
  first: string
  last: string
  next: string | null
  prev: string | null
} {
  const url = new URL(baseUrl)

  const buildLink = (page: number) => {
    url.searchParams.set("page", String(page))
    return url.toString()
  }

  return {
    self: buildLink(meta.page),
    first: buildLink(1),
    last: buildLink(meta.totalPages),
    next: meta.nextPage ? buildLink(meta.nextPage) : null,
    prev: meta.prevPage ? buildLink(meta.prevPage) : null,
  }
}
