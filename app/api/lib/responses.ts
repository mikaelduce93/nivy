import { NextResponse } from "next/server"

export class APIResponse {
  static success(data: any = {}, status = 200) {
    return NextResponse.json(
      {
        success: true,
        ...data,
      },
      { status }
    )
  }

  static error(message: string, status = 400, details: any = null) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(details ? { details } : {}),
      },
      { status }
    )
  }

  static unauthorized(message = "Unauthorized") {
    return this.error(message, 401)
  }

  static forbidden(message = "Forbidden") {
    return this.error(message, 403)
  }

  static notFound(message = "Not Found") {
    return this.error(message, 404)
  }

  static serverError(message = "Internal Server Error", error: any = null) {
    if (error) {
      console.error("[API Error]:", error)
    }
    return this.error(message, 500)
  }
}
