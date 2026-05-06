import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { randomBytes } from "node:crypto"

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const userInfo = await getUserRole()

    if (!userInfo) {
      return NextResponse.json(
        { success: false, error: "Non authentifié" },
        { status: 401 }
      )
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Aucun fichier fourni" },
        { status: 400 }
      )
    }

    // Validate file type
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { success: false, error: "Le fichier doit être une image" },
        { status: 400 }
      )
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "L'image ne doit pas dépasser 5MB" },
        { status: 400 }
      )
    }

    // Generate unique filename
    const fileExt = file.name.split(".").pop() || "jpg"
    const fileName = `${userInfo.profileId}/${Date.now()}-${randomBytes(6).toString("hex")}.${fileExt}`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { success: false, error: "Erreur lors de l'upload" },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(fileName)

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: data.path
    })
  } catch (error) {
    console.error("Avatar upload error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur serveur" },
      { status: 500 }
    )
  }
}
