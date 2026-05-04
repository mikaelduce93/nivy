# 💻 EXEMPLES D'IMPLÉMENTATION - PROFIL TEEN

## 🎨 1. AVATAR BUILDER

### Concept : Interface de Création d'Avatar

```typescript
// components/teen/avatar-builder.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

interface AvatarConfig {
  face: {
    skin: string
    eyes: string
    nose: string
    mouth: string
  }
  hair: {
    style: string
    color: string
  }
  clothes: {
    top: string
    bottom: string
    shoes: string
  }
  accessories: string[]
}

export function AvatarBuilder() {
  const [config, setConfig] = useState<AvatarConfig>({
    face: { skin: "light", eyes: "default", nose: "default", mouth: "smile" },
    hair: { style: "short", color: "brown" },
    clothes: { top: "tshirt", bottom: "jeans", shoes: "sneakers" },
    accessories: []
  })

  const [preview, setPreview] = useState<string | null>(null)

  const handleSave = async () => {
    // Générer image preview
    const imageData = await generateAvatarImage(config)
    
    // Sauvegarder en DB
    await fetch("/api/teen/avatar", {
      method: "POST",
      body: JSON.stringify({ config, preview: imageData })
    })
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Preview */}
      <Card className="p-8">
        <div className="w-64 h-64 mx-auto">
          <AvatarPreview config={config} />
        </div>
        <Button onClick={handleSave} className="w-full mt-4">
          Sauvegarder
        </Button>
      </Card>

      {/* Customization */}
      <div className="space-y-6">
        <FaceCustomizer 
          config={config.face}
          onChange={(face) => setConfig({ ...config, face })}
        />
        <HairCustomizer
          config={config.hair}
          onChange={(hair) => setConfig({ ...config, hair })}
        />
        <ClothesCustomizer
          config={config.clothes}
          onChange={(clothes) => setConfig({ ...config, clothes })}
        />
      </div>
    </div>
  )
}
```

### API Endpoint

```typescript
// app/api/teen/avatar/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { config, preview } = await request.json()

  // Sauvegarder config avatar
  const { data, error } = await supabase
    .from("user_avatars")
    .upsert({
      user_id: user.id,
      config: config,
      preview_url: preview,
      updated_at: new Date().toISOString()
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data })
}
```

### Génération Image Preview

```typescript
// lib/avatar/generate-preview.ts
import { Avatar } from "avataaars"

export async function generateAvatarImage(config: AvatarConfig): Promise<string> {
  // Option 1: Utiliser Avataaars (Recommandé - Gratuit)
  // Avataaars génère un SVG, on le convertit en PNG
  const svgString = Avatar.render(config)
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml' })
  const svgUrl = URL.createObjectURL(svgBlob)
  
  // Convertir SVG en PNG avec Canvas
  const img = new Image()
  img.src = svgUrl
  
  return new Promise((resolve) => {
    img.onload = () => {
      const canvas = document.createElement("canvas")
      canvas.width = 512
      canvas.height = 512
      const ctx = canvas.getContext("2d")
      ctx.drawImage(img, 0, 0, 512, 512)
      const pngData = canvas.toDataURL("image/png")
      URL.revokeObjectURL(svgUrl)
      resolve(pngData)
    }
  })
  
  // Option 2: Utiliser Avaturn API (Si besoin de 3D)
  // const response = await fetch('https://api.avaturn.me/v1/avatars', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${API_KEY}` },
  //   body: JSON.stringify(config)
  // })
  // const { avatarUrl } = await response.json()
  // return avatarUrl
}
```

---

## 🎨 2. BOUTIQUE PERSONNALISATION

### Concept : Page Boutique avec Preview

```typescript
// app/teen/shop/customization/page.tsx
import { getAllFrames, getAllTitles, getAllColors, getAllBackgrounds } from "@/gamification-system/features/profile-customization/actions"
import { CustomizationShop } from "@/components/teen/customization-shop"

export default async function CustomizationShopPage() {
  const [frames, titles, colors, backgrounds] = await Promise.all([
    getAllFrames(),
    getAllTitles(),
    getAllColors(),
    getAllBackgrounds()
  ])

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-black mb-8">Boutique Personnalisation</h1>
      <CustomizationShop
        frames={frames}
        titles={titles}
        colors={colors}
        backgrounds={backgrounds}
      />
    </div>
  )
}
```

### Composant Boutique

```typescript
// components/teen/customization-shop.tsx
"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FrameSelector } from "@/gamification-system/components/profile-customization/profile-frame"
import { ProfilePreview } from "@/components/teen/profile-preview"

export function CustomizationShop({ frames, titles, colors, backgrounds }) {
  const [selectedFrame, setSelectedFrame] = useState(null)
  const [selectedTitle, setSelectedTitle] = useState(null)
  const [selectedColor, setSelectedColor] = useState(null)
  const [selectedBackground, setSelectedBackground] = useState(null)

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Preview */}
      <div className="sticky top-8">
        <ProfilePreview
          frame={selectedFrame}
          title={selectedTitle}
          color={selectedColor}
          background={selectedBackground}
        />
      </div>

      {/* Boutique */}
      <Tabs defaultValue="frames">
        <TabsList>
          <TabsTrigger value="frames">Frames</TabsTrigger>
          <TabsTrigger value="titles">Titles</TabsTrigger>
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="backgrounds">Backgrounds</TabsTrigger>
        </TabsList>

        <TabsContent value="frames">
          <FrameSelector
            frames={frames}
            onSelect={setSelectedFrame}
          />
        </TabsContent>

        <TabsContent value="titles">
          <TitleSelector
            titles={titles}
            onSelect={setSelectedTitle}
          />
        </TabsContent>

        {/* ... autres onglets */}
      </Tabs>
    </div>
  )
}
```

### API Équipement

```typescript
// app/api/teen/customization/equip/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { itemType, itemId } = await request.json()

  // Vérifier que l'utilisateur possède l'item
  const { data: ownsItem } = await supabase
    .rpc("check_user_owns_item", {
      p_user_id: user.id,
      p_item_type: itemType,
      p_item_id: itemId
    })

  if (!ownsItem) {
    return NextResponse.json({ error: "Item not owned" }, { status: 403 })
  }

  // Équiper l'item
  const { error } = await supabase
    .rpc("equip_profile_item", {
      p_user_id: user.id,
      p_item_type: itemType,
      p_item_id: itemId
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

---

## 👥 3. FRIEND SYSTEM AVANCÉ

### Recherche Avancée

```typescript
// app/teen/friends/search/page.tsx
"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { FriendSearchResults } from "@/components/teen/friend-search-results"

export default function FriendSearchPage() {
  const [query, setQuery] = useState("")
  const [filters, setFilters] = useState({
    school: "",
    interests: [],
    minLevel: 1,
    maxLevel: 100
  })
  const [results, setResults] = useState([])

  const handleSearch = async () => {
    const response = await fetch("/api/teen/friends/search", {
      method: "POST",
      body: JSON.stringify({ query, filters })
    })
    const data = await response.json()
    setResults(data.results)
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-4xl font-black mb-8">Rechercher des Amis</h1>
      
      <div className="space-y-4 mb-6">
        <Input
          placeholder="Pseudo, nom..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        
        <Select
          value={filters.school}
          onValueChange={(value) => setFilters({ ...filters, school: value })}
        >
          <option value="">Toutes les écoles</option>
          {/* Options écoles */}
        </Select>

        <Button onClick={handleSearch}>Rechercher</Button>
      </div>

      <FriendSearchResults results={results} />
    </div>
  )
}
```

### API Recherche

```typescript
// app/api/teen/friends/search/route.ts
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { query, filters } = await request.json()

  let queryBuilder = supabase
    .from("profiles")
    .select(`
      *,
      teen_data:teens (*)
    `)
    .eq("role", "teen")
    .neq("id", user.id) // Exclure soi-même

  // Recherche par pseudo/nom
  if (query) {
    queryBuilder = queryBuilder.or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
  }

  // Filtres
  if (filters.school) {
    queryBuilder = queryBuilder.eq("teen_data.school", filters.school)
  }

  if (filters.minLevel) {
    queryBuilder = queryBuilder.gte("level", filters.minLevel)
  }

  if (filters.maxLevel) {
    queryBuilder = queryBuilder.lte("level", filters.maxLevel)
  }

  const { data, error } = await queryBuilder.limit(20)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Vérifier statut amitié
  const friendStatuses = await Promise.all(
    data.map(async (profile) => {
      const { data: connection } = await supabase
        .from("teen_connections")
        .select("status")
        .or(`teen_id.eq.${user.id}.and.friend_id.eq.${profile.id},teen_id.eq.${profile.id}.and.friend_id.eq.${user.id}`)
        .single()

      return {
        ...profile,
        friendStatus: connection?.status || "none"
      }
    })
  )

  return NextResponse.json({ results: friendStatuses })
}
```

---

## 💬 4. MESSAGING

### Interface Chat

```typescript
// app/teen/messages/[id]/page.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { MessageList } from "@/components/teen/message-list"
import { MessageInput } from "@/components/teen/message-input"

export default function ChatPage({ params }: { params: { id: string } }) {
  const [messages, setMessages] = useState([])
  const supabase = createClient()

  useEffect(() => {
    // Charger messages initiaux
    loadMessages()

    // Écouter nouveaux messages en temps réel
    const channel = supabase
      .channel(`chat:${params.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${params.id}`
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [params.id])

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", params.id)
      .order("created_at", { ascending: true })

    setMessages(data || [])
  }

  const sendMessage = async (content: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from("messages").insert({
      conversation_id: params.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString()
    })
  }

  return (
    <div className="flex flex-col h-screen">
      <MessageList messages={messages} />
      <MessageInput onSend={sendMessage} />
    </div>
  )
}
```

---

## 📱 5. SOCIAL SHARING

### Génération Image Achievement

```typescript
// lib/social/generate-achievement-card.ts
export async function generateAchievementCard(achievement: any): Promise<string> {
  const canvas = document.createElement("canvas")
  canvas.width = 1080
  canvas.height = 1920 // Format Instagram Story
  const ctx = canvas.getContext("2d")

  // Fond dégradé
  const gradient = ctx.createLinearGradient(0, 0, 0, 1920)
  gradient.addColorStop(0, "#8b5cf6")
  gradient.addColorStop(1, "#ec4899")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, 1080, 1920)

  // Titre
  ctx.fillStyle = "#FFFFFF"
  ctx.font = "bold 72px Arial"
  ctx.textAlign = "center"
  ctx.fillText("Achievement Débloqué!", 540, 200)

  // Icône achievement
  ctx.font = "120px Arial"
  ctx.fillText(achievement.icon, 540, 500)

  // Nom achievement
  ctx.font = "bold 60px Arial"
  ctx.fillText(achievement.name, 540, 700)

  // Description
  ctx.font = "48px Arial"
  ctx.fillText(achievement.description, 540, 850)

  // Logo app
  // ... dessiner logo

  // Hashtag
  ctx.font = "36px Arial"
  ctx.fillText("#TeensPartyMorocco", 540, 1800)

  return canvas.toDataURL("image/png")
}
```

### Partage Social

```typescript
// components/teen/social-share.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Share2, Instagram, MessageCircle } from "lucide-react"

export function SocialShare({ achievement, stats }) {
  const handleShare = async (platform: string) => {
    // Générer image
    const imageData = await generateAchievementCard(achievement)

    if (platform === "instagram") {
      // Utiliser Web Share API
      if (navigator.share) {
        const blob = await (await fetch(imageData)).blob()
        const file = new File([blob], "achievement.png", { type: "image/png" })
        
        await navigator.share({
          files: [file],
          title: `J'ai débloqué ${achievement.name}!`,
          text: achievement.description
        })
      }
    }

    // Tracking
    await fetch("/api/teen/social/share", {
      method: "POST",
      body: JSON.stringify({ platform, type: "achievement", itemId: achievement.id })
    })

    // XP bonus
    await fetch("/api/teen/xp/add", {
      method: "POST",
      body: JSON.stringify({ amount: 50, source: "social_share" })
    })
  }

  return (
    <div className="flex gap-2">
      <Button onClick={() => handleShare("instagram")}>
        <Instagram className="w-4 h-4 mr-2" />
        Instagram
      </Button>
      <Button onClick={() => handleShare("whatsapp")}>
        <MessageCircle className="w-4 h-4 mr-2" />
        WhatsApp
      </Button>
    </div>
  )
}
```

---

## 📊 6. ACTIVITY FEED

### Composant Feed

```typescript
// components/teen/activity-feed.tsx
"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ActivityCard } from "@/components/teen/activity-card"

export function ActivityFeed() {
  const [activities, setActivities] = useState([])
  const supabase = createClient()

  useEffect(() => {
    loadActivities()

    // Écouter nouvelles activités
    const channel = supabase
      .channel("activity_feed")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "activities"
      }, (payload) => {
        setActivities((prev) => [payload.new, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadActivities = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    // Récupérer activités des amis
    const { data: friends } = await supabase
      .from("teen_connections")
      .select("friend_id")
      .eq("teen_id", user.id)
      .eq("status", "accepted")

    const friendIds = friends?.map(f => f.friend_id) || []

    const { data } = await supabase
      .from("activities")
      .select(`
        *,
        user:profiles!user_id (*)
      `)
      .in("user_id", friendIds)
      .order("created_at", { ascending: false })
      .limit(50)

    setActivities(data || [])
  }

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <ActivityCard key={activity.id} activity={activity} />
      ))}
    </div>
  )
}
```

---

## 🎯 7. PROFIL IMMERSIF

### Composant Profil Redesigné

```typescript
// app/teen/profile/page.tsx (version améliorée)
import { ProfileHeader } from "@/components/teen/profile-header"
import { ProfileStats } from "@/components/teen/profile-stats"
import { ProfileTimeline } from "@/components/teen/profile-timeline"
import { ProfileGallery } from "@/components/teen/profile-gallery"

export default async function TeenProfilePage() {
  // ... récupération données

  return (
    <div className="min-h-screen">
      {/* Header avec fond personnalisé */}
      <ProfileHeader
        profile={profile}
        customization={customization}
        avatar={avatar}
      />

      {/* Stats visuelles */}
      <ProfileStats stats={stats} />

      {/* Timeline */}
      <ProfileTimeline activities={activities} />

      {/* Galerie créations */}
      <ProfileGallery creations={creations} />
    </div>
  )
}
```

### Composant Header avec Fond Personnalisé

```typescript
// components/teen/profile-header.tsx
export function ProfileHeader({ profile, customization, avatar }) {
  const backgroundStyle = customization?.background
    ? { background: customization.background.background_value }
    : { background: "linear-gradient(135deg, #18181b 0%, #27272a 100%)" }

  return (
    <div className="relative h-64" style={backgroundStyle}>
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      
      {/* Contenu */}
      <div className="relative z-10 flex items-center gap-6 p-8">
        {/* Avatar avec frame */}
        <AvatarWithFrame
          avatar={avatar}
          frame={customization?.frame}
          size="xl"
        />
        
        {/* Infos */}
        <div>
          <h1 className="text-4xl font-black text-white">
            {profile.full_name}
          </h1>
          {customization?.title && (
            <div className="flex items-center gap-2 mt-2">
              <span className="text-2xl">{customization.title.emoji}</span>
              <span 
                className="text-lg font-bold"
                style={{ color: customization.title.color }}
              >
                {customization.title.display_text}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

---

## 📝 NOTES D'IMPLÉMENTATION

### Performance
- Utiliser `React.memo` pour les composants lourds
- Lazy loading pour les images
- Virtual scrolling pour les listes longues
- Cache des données avec React Query ou SWR

### Sécurité
- Vérifier permissions avant chaque action
- RLS (Row Level Security) sur toutes les tables
- Validation côté serveur
- Rate limiting sur les APIs

### UX
- Loading states partout
- Error handling gracieux
- Optimistic updates
- Animations fluides (Framer Motion)

---

**Ces exemples sont des concepts de base. Adapter selon votre architecture actuelle.**

