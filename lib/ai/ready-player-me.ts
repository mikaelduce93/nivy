/**
 * Ready Player Me Integration
 * Service pour générer et gérer les avatars Ready Player Me
 */

export interface ReadyPlayerMeConfig {
  subdomain?: string
  apiKey?: string
}

export interface AvatarGenerationParams {
  userId: string
  photoUrl?: string
  gender?: "male" | "female" | "neutral"
  style?: "realistic" | "stylized"
}

export class ReadyPlayerMeService {
  private subdomain: string
  private apiKey: string | null

  constructor(config?: ReadyPlayerMeConfig) {
    this.subdomain = config?.subdomain || process.env.READY_PLAYER_ME_SUBDOMAIN || "teenparty"
    this.apiKey = config?.apiKey || process.env.READY_PLAYER_ME_API_KEY || null
  }

  /**
   * Génère un avatar URL Ready Player Me
   * Ready Player Me utilise une URL simple avec des paramètres
   */
  generateAvatarUrl(params: AvatarGenerationParams): string {
    const baseUrl = `https://${this.subdomain}.readyplayer.me`
    const queryParams = new URLSearchParams()

    if (params.gender) {
      queryParams.append("gender", params.gender)
    }

    if (params.style) {
      queryParams.append("style", params.style)
    }

    // URL de l'avatar avec paramètres
    const avatarUrl = `${baseUrl}/avatar?${queryParams.toString()}`

    return avatarUrl
  }

  /**
   * Crée un lien de personnalisation d'avatar
   * L'utilisateur sera redirigé vers Ready Player Me pour créer son avatar
   */
  createCustomizationLink(userId: string, redirectUrl?: string): string {
    const baseUrl = `https://${this.subdomain}.readyplayer.me`
    const params = new URLSearchParams({
      userId,
    })

    if (redirectUrl) {
      params.append("redirectUrl", redirectUrl)
    }

    return `${baseUrl}/customize?${params.toString()}`
  }

  /**
   * Récupère l'URL de l'avatar généré
   * À appeler après que l'utilisateur a créé son avatar
   */
  async getAvatarUrl(userId: string): Promise<string | null> {
    try {
      // Ready Player Me stocke les avatars avec l'userId
      const avatarUrl = `https://models.readyplayer.me/${userId}.glb`
      
      // Vérifier si l'avatar existe
      const response = await fetch(avatarUrl, { method: "HEAD" })
      
      if (response.ok) {
        return avatarUrl
      }
      
      return null
    } catch (error) {
      console.error("Error fetching Ready Player Me avatar:", error)
      return null
    }
  }

  /**
   * Génère un avatar à partir d'une photo
   * Nécessite l'API Ready Player Me (si disponible)
   */
  async generateAvatarFromPhoto(params: AvatarGenerationParams): Promise<string | null> {
    if (!this.apiKey) {
      console.error("Ready Player Me API key not configured")
      return null
    }

    if (!params.photoUrl) {
      console.error("Photo URL required for avatar generation")
      return null
    }

    try {
      // Appel à l'API Ready Player Me pour générer depuis une photo
      // Note: Cette fonctionnalité peut nécessiter un plan payant
      const response = await fetch("https://api.readyplayer.me/v1/avatars", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          userId: params.userId,
          photoUrl: params.photoUrl,
          gender: params.gender || "neutral",
          style: params.style || "stylized",
        }),
      })

      if (!response.ok) {
        throw new Error(`Ready Player Me API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.avatarUrl || null
    } catch (error) {
      console.error("Error generating avatar from photo:", error)
      return null
    }
  }
}

/**
 * Helper function pour intégrer Ready Player Me dans l'app
 */
export async function setupReadyPlayerMeAvatar(teenId: string, photoUrl?: string): Promise<string | null> {
  const service = new ReadyPlayerMeService()
  
  // Si une photo est fournie, générer depuis la photo
  if (photoUrl) {
    return await service.generateAvatarFromPhoto({
      userId: teenId,
      photoUrl,
      style: "stylized",
    })
  }
  
  // Sinon, retourner le lien de personnalisation
  return service.createCustomizationLink(teenId, `${process.env.NEXT_PUBLIC_APP_URL}/teen/profile`)
}


