/**
 * Supabase database types - shim
 * ================================
 *
 * Minimal declaration so that `import type { Database } from '@/types/supabase'`
 * compiles. The real schema is consumed via `data as <Type>` casts in
 * `lib/queries/*` so a permissive structural type is sufficient here.
 *
 * TODO(ts): widen type — replace this shim with generated types via
 * `supabase gen types typescript --project-id <id> > types/supabase.ts`.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericRow = { [key: string]: any }

interface GenericTable {
  Row: GenericRow
  Insert: GenericRow
  Update: GenericRow
}

export interface Database {
  public: {
    Tables: {
      [tableName: string]: GenericTable
    }
    Views: {
      [viewName: string]: { Row: GenericRow }
    }
    Functions: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [fnName: string]: { Args: any; Returns: any }
    }
    Enums: {
      [enumName: string]: string
    }
  }
}

export type { Json }
