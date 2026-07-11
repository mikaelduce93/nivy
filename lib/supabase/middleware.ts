import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { SupabaseClient, User } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

type UpdateSessionResult = {
  response: NextResponse
  user: User | null
  supabase: SupabaseClient | null
}

export async function updateSession(request: NextRequest): Promise<UpdateSessionResult> {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

  // If Supabase credentials are not available, skip authentication
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("[v0] Supabase credentials not found, skipping authentication middleware")
    return { response: supabaseResponse, user: null, supabase: null }
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({
          request,
        })
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
      },
    },
  })

  let user: User | null = null

  try {
    const {
      data: { user: resolvedUser },
    } = await supabase.auth.getUser()
    user = resolvedUser

    if (
      !user &&
      !request.nextUrl.pathname.startsWith("/auth") &&
      (request.nextUrl.pathname.startsWith("/dashboard") || request.nextUrl.pathname.startsWith("/profile"))
    ) {
      const url = request.nextUrl.clone()
      url.pathname = "/auth/login"
      return { response: NextResponse.redirect(url), user: null, supabase }
    }
  } catch (error) {
    console.error("[v0] Error in updateSession:", error)
  }

  return { response: supabaseResponse, user, supabase }
}
