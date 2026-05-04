import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // Rediriger vers la page d'auto-login côté client
  return NextResponse.redirect(new URL("/test/partner-venue/auto-login", request.url))
}

