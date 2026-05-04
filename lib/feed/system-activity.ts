import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const SYSTEM_BOTS = [
  { id: 'bot_admin', name: 'L\'Admin', avatar: '/avatars/admin.png' },
  { id: 'bot_teen', name: 'TeenBot', avatar: '/avatars/robot.png' },
]

const TEMPLATES = {
  event: [
    "🎉 Nouvel événement ajouté : {eventName} ! Réserve vite ta place.",
    "👀 La billetterie pour {eventName} est ouverte. Les places partent vite !",
    "🔥 Prêt pour {eventName} ? Ça va être légendaire.",
  ],
  challenge: [
    "⚡ Défi du jour : {challengeName} (+50 XP)",
    "💪 Qui peut relever le défi {challengeName} ?",
    "🎯 Objectif du jour : {challengeName}. À toi de jouer !",
  ],
  tip: [
    "💡 Astuce : Complète ton profil pour gagner un badge exclusif.",
    "💡 Astuce : Invite un ami pour gagner 200 XP !",
    "💡 Astuce : Maintiens ton streak pour multiplier tes gains.",
  ]
}

export async function generateSystemActivity() {
  console.log('Generating system activity...')

  // Check recent activity count (last 2 hours)
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
  
  const { count } = await supabase
    .from('social_activities') // Assuming this table exists or similar
    .select('*', { count: 'exact', head: true })
    .gt('created_at', twoHoursAgo)

  // If plenty of activity, don't spam
  if (count && count > 5) {
    console.log('Feed is active, skipping system generation.')
    return
  }

  // Pick a random template type
  const types = ['event', 'challenge', 'tip'] as const
  const type = types[Math.floor(Math.random() * types.length)]
  const bot = SYSTEM_BOTS[Math.floor(Math.random() * SYSTEM_BOTS.length)]

  let title = ""
  let data = {}

  switch (type) {
    case 'event': {
      // Fetch a random upcoming event
      const { data: events } = await supabase
        .from('events')
        .select('title')
        .gt('event_date', new Date().toISOString())
        .limit(1)
      
      const eventName = events?.[0]?.title || "Soirée Mystère"
      const eventTemplate = TEMPLATES.event[Math.floor(Math.random() * TEMPLATES.event.length)]
      title = eventTemplate.replace('{eventName}', eventName)
      data = { type: 'event_promo', eventName }
      break
    }

    case 'challenge': {
      const challengeName = "10k Pas" // Mock, normally fetch from DB
      const challengeTemplate = TEMPLATES.challenge[Math.floor(Math.random() * TEMPLATES.challenge.length)]
      title = challengeTemplate.replace('{challengeName}', challengeName)
      data = { type: 'challenge_promo', challengeName }
      break
    }

    case 'tip':
      title = TEMPLATES.tip[Math.floor(Math.random() * TEMPLATES.tip.length)]
      data = { type: 'tip' }
      break
  }

  // Insert into DB
  // Note: Schema needs to support system activities (no user_id or special user_id)
  await supabase.from('social_activities').insert({
    user_id: bot.id, // Ensure this ID exists or schema allows null/special handling
    type: 'system_post',
    title: bot.name,
    description: title,
    metadata: { ...data, avatar: bot.avatar },
    created_at: new Date().toISOString()
  })

  console.log(`System activity generated: [${type}] ${title}`)
}

