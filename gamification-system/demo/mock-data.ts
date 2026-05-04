/**
 * TEENS PARTY MOROCCO - Demo Mock Data
 * =====================================
 *
 * Données de démonstration pour tester le système de gamification.
 */

// ============================================================================
// USER DATA
// ============================================================================

export const mockUser = {
  id: "demo-user-001",
  username: "PartyKing",
  email: "demo@teenspartymorocco.ma",
  avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=PartyKing",
  level: 24,
  xp: 12450,
  coins: 3500,
  created_at: "2024-01-15T10:00:00Z",
}

export const mockUserStats = {
  totalXp: 12450,
  totalCoins: 3500,
  level: 24,
  eventsAttended: 18,
  challengesCompleted: 45,
  badgesEarned: 12,
  friendsCount: 67,
  crewsJoined: 2,
  gamesPlayed: 89,
  currentStreak: 7,
  longestStreak: 21,
}

// ============================================================================
// BADGES & ACHIEVEMENTS
// ============================================================================

export const mockBadges = [
  {
    id: "badge-001",
    slug: "first_event",
    name: "Premier Pas",
    description: "Assister à ton premier événement",
    icon: "Calendar",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=first_event",
    category: "events",
    rarity: "common",
    xp_reward: 50,
    unlocked: true,
    unlocked_at: "2024-01-20T22:00:00Z",
    progress: 100,
  },
  {
    id: "badge-002",
    slug: "social_butterfly",
    name: "Papillon Social",
    description: "Avoir 50 amis",
    icon: "Users",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=social",
    category: "social",
    rarity: "rare",
    xp_reward: 150,
    unlocked: true,
    unlocked_at: "2024-03-10T15:30:00Z",
    progress: 100,
  },
  {
    id: "badge-003",
    slug: "party_legend",
    name: "Légende des Soirées",
    description: "Assister à 25 événements",
    icon: "Trophy",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=legend",
    category: "events",
    rarity: "legendary",
    xp_reward: 500,
    unlocked: false,
    progress: 72,
    current: 18,
    target: 25,
  },
  {
    id: "badge-004",
    slug: "challenge_master",
    name: "Maître des Défis",
    description: "Compléter 50 défis",
    icon: "Zap",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=challenge",
    category: "challenges",
    rarity: "epic",
    xp_reward: 300,
    unlocked: false,
    progress: 90,
    current: 45,
    target: 50,
  },
  {
    id: "badge-005",
    slug: "collector",
    name: "Collectionneur",
    description: "Compléter une collection",
    icon: "Layers",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=collector",
    category: "collections",
    rarity: "rare",
    xp_reward: 200,
    unlocked: true,
    unlocked_at: "2024-05-01T12:00:00Z",
    progress: 100,
  },
  {
    id: "badge-006",
    slug: "streak_week",
    name: "Semaine de Feu",
    description: "Maintenir une série de 7 jours",
    icon: "Flame",
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=streak",
    category: "engagement",
    rarity: "common",
    xp_reward: 75,
    unlocked: true,
    unlocked_at: "2024-06-15T08:00:00Z",
    progress: 100,
  },
]

// ============================================================================
// LEADERBOARD
// ============================================================================

export const mockLeaderboard = [
  { rank: 1, username: "DJMaster", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DJMaster", xp: 45000, level: 42, trend: "up" },
  { rank: 2, username: "NightQueen", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightQueen", xp: 42500, level: 40, trend: "same" },
  { rank: 3, username: "PartyAnimal", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=PartyAnimal", xp: 38000, level: 37, trend: "up" },
  { rank: 4, username: "ClubKing", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=ClubKing", xp: 35500, level: 35, trend: "down" },
  { rank: 5, username: "RaveStar", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=RaveStar", xp: 32000, level: 33, trend: "up" },
  { rank: 6, username: "BeatDropper", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=BeatDropper", xp: 28500, level: 30, trend: "same" },
  { rank: 7, username: "VIPVibes", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=VIPVibes", xp: 25000, level: 28, trend: "up" },
  { rank: 8, username: "PartyKing", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=PartyKing", xp: 12450, level: 24, trend: "up", isCurrentUser: true },
  { rank: 9, username: "NeonDancer", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NeonDancer", xp: 11000, level: 22, trend: "down" },
  { rank: 10, username: "MidnightRider", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=MidnightRider", xp: 9500, level: 20, trend: "same" },
]

// ============================================================================
// MISSIONS
// ============================================================================

export const mockMissions = {
  daily: [
    {
      id: "daily-001",
      title: "Connexion quotidienne",
      description: "Se connecter à l'application",
      icon: "LogIn",
      xp_reward: 10,
      coins_reward: 5,
      progress: 100,
      completed: true,
      type: "daily",
    },
    {
      id: "daily-002",
      title: "Jouer à un mini-jeu",
      description: "Participer à n'importe quel mini-jeu",
      icon: "Gamepad2",
      xp_reward: 25,
      coins_reward: 10,
      progress: 0,
      completed: false,
      type: "daily",
    },
    {
      id: "daily-003",
      title: "Réagir à 3 activités",
      description: "Liker ou commenter des activités d'amis",
      icon: "Heart",
      xp_reward: 15,
      coins_reward: 5,
      progress: 66,
      current: 2,
      target: 3,
      completed: false,
      type: "daily",
    },
  ],
  weekly: [
    {
      id: "weekly-001",
      title: "Assister à un événement",
      description: "Participer à un événement cette semaine",
      icon: "Calendar",
      xp_reward: 100,
      coins_reward: 50,
      progress: 100,
      completed: true,
      type: "weekly",
    },
    {
      id: "weekly-002",
      title: "Gagner 3 défis",
      description: "Remporter 3 défis contre des amis",
      icon: "Trophy",
      xp_reward: 150,
      coins_reward: 75,
      progress: 33,
      current: 1,
      target: 3,
      completed: false,
      type: "weekly",
    },
    {
      id: "weekly-003",
      title: "Partager sur les réseaux",
      description: "Partager une activité sur les réseaux sociaux",
      icon: "Share2",
      xp_reward: 50,
      coins_reward: 25,
      progress: 0,
      completed: false,
      type: "weekly",
    },
  ],
  monthly: [
    {
      id: "monthly-001",
      title: "VIP du mois",
      description: "Atteindre le top 10 du classement mensuel",
      icon: "Crown",
      xp_reward: 500,
      coins_reward: 250,
      progress: 80,
      completed: false,
      type: "monthly",
    },
  ],
}

// ============================================================================
// REWARDS SHOP
// ============================================================================

export const mockShopItems = [
  {
    id: "shop-001",
    name: "Cadre Néon",
    description: "Un cadre de profil lumineux effet néon",
    category: "frames",
    price_coins: 500,
    price_xp: null,
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=neon-frame",
    rarity: "rare",
    stock: null,
    owned: false,
  },
  {
    id: "shop-002",
    name: "Titre: Party Legend",
    description: "Affiche ce titre exclusif sur ton profil",
    category: "titles",
    price_coins: 1000,
    price_xp: null,
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=title-legend",
    rarity: "epic",
    stock: 50,
    owned: false,
  },
  {
    id: "shop-003",
    name: "Pack de Stickers",
    description: "10 stickers exclusifs pour les commentaires",
    category: "stickers",
    price_coins: 200,
    price_xp: null,
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=sticker-pack",
    rarity: "common",
    stock: null,
    owned: true,
  },
  {
    id: "shop-004",
    name: "Spin Bonus",
    description: "Un tour de roue supplémentaire",
    category: "consumables",
    price_coins: 100,
    price_xp: 500,
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=spin-bonus",
    rarity: "common",
    stock: null,
    owned: false,
  },
  {
    id: "shop-005",
    name: "Couleur Profil: Or",
    description: "Colore ton profil en or",
    category: "colors",
    price_coins: 750,
    price_xp: null,
    image_url: "https://api.dicebear.com/7.x/shapes/svg?seed=gold-color",
    rarity: "rare",
    stock: null,
    owned: false,
  },
]

// ============================================================================
// FORTUNE WHEEL
// ============================================================================

export const mockWheelSegments = [
  { id: 1, label: "50 XP", value: 50, type: "xp", color: "#06B6D4", probability: 25 },
  { id: 2, label: "100 Coins", value: 100, type: "coins", color: "#F59E0B", probability: 20 },
  { id: 3, label: "Pack Rare", value: 1, type: "pack", color: "#8B5CF6", probability: 10 },
  { id: 4, label: "25 XP", value: 25, type: "xp", color: "#22C55E", probability: 30 },
  { id: 5, label: "Spin Bonus", value: 1, type: "spin", color: "#EC4899", probability: 5 },
  { id: 6, label: "200 XP", value: 200, type: "xp", color: "#EF4444", probability: 8 },
  { id: 7, label: "50 Coins", value: 50, type: "coins", color: "#3B82F6", probability: 15 },
  { id: 8, label: "JACKPOT!", value: 1000, type: "coins", color: "#FFD700", probability: 2 },
]

export const mockWheelStatus = {
  spinsRemaining: 1,
  maxSpins: 2,
  nextFreeSpinAt: null,
  lastSpinAt: "2024-12-14T10:00:00Z",
  todayWinnings: { xp: 75, coins: 100 },
}

// ============================================================================
// CHALLENGES
// ============================================================================

export const mockChallenges = [
  {
    id: "challenge-001",
    type: "duel",
    title: "Quiz Musical",
    description: "Défi de connaissance musicale",
    opponent: {
      username: "DJMaster",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DJMaster",
      level: 42,
    },
    status: "pending",
    xp_reward: 100,
    coins_reward: 50,
    expires_at: "2024-12-16T18:00:00Z",
  },
  {
    id: "challenge-002",
    type: "duel",
    title: "Memory Challenge",
    description: "Qui a la meilleure mémoire ?",
    opponent: {
      username: "NightQueen",
      avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightQueen",
      level: 40,
    },
    status: "active",
    your_score: 850,
    opponent_score: 720,
    xp_reward: 100,
    coins_reward: 50,
    expires_at: "2024-12-15T23:59:59Z",
  },
  {
    id: "challenge-003",
    type: "team",
    title: "Crew vs Crew",
    description: "Défi d'équipe hebdomadaire",
    teams: [
      { name: "Night Owls", score: 15000, members: 8 },
      { name: "Party Legends", score: 14200, members: 7 },
    ],
    your_team: "Night Owls",
    status: "active",
    xp_reward: 250,
    coins_reward: 100,
    ends_at: "2024-12-22T23:59:59Z",
  },
]

// ============================================================================
// CREWS
// ============================================================================

export const mockCrews = [
  {
    id: "crew-001",
    name: "Night Owls",
    description: "Les rois de la nuit",
    logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=night-owls",
    banner_color: "#8B5CF6",
    level: 15,
    xp: 45000,
    members_count: 12,
    max_members: 15,
    rank: 3,
    is_member: true,
    role: "admin",
    created_at: "2024-02-01T00:00:00Z",
  },
  {
    id: "crew-002",
    name: "Party Legends",
    description: "Légendes vivantes des soirées",
    logo_url: "https://api.dicebear.com/7.x/shapes/svg?seed=party-legends",
    banner_color: "#F59E0B",
    level: 18,
    xp: 62000,
    members_count: 14,
    max_members: 15,
    rank: 1,
    is_member: false,
    created_at: "2024-01-15T00:00:00Z",
  },
]

export const mockCrewMembers = [
  { id: "m1", username: "PartyKing", avatar_url: mockUser.avatar_url, role: "admin", xp_contributed: 5000, joined_at: "2024-02-01T00:00:00Z" },
  { id: "m2", username: "DJMaster", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DJMaster", role: "leader", xp_contributed: 12000, joined_at: "2024-02-01T00:00:00Z" },
  { id: "m3", username: "NightQueen", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightQueen", role: "member", xp_contributed: 8500, joined_at: "2024-02-05T00:00:00Z" },
  { id: "m4", username: "RaveStar", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=RaveStar", role: "member", xp_contributed: 6200, joined_at: "2024-02-10T00:00:00Z" },
]

// ============================================================================
// MINI GAMES
// ============================================================================

export const mockMiniGames = [
  {
    id: "game-001",
    slug: "music_quiz",
    name: "Quiz Musical",
    description: "Devine la chanson en quelques secondes",
    icon: "Music",
    color: "#8B5CF6",
    highScore: 1250,
    playCount: 34,
    lastPlayed: "2024-12-14T20:00:00Z",
    xp_per_play: 20,
    available: true,
  },
  {
    id: "game-002",
    slug: "memory",
    name: "Memory Party",
    description: "Trouve les paires le plus vite possible",
    icon: "Brain",
    color: "#EC4899",
    highScore: 890,
    playCount: 22,
    lastPlayed: "2024-12-13T18:30:00Z",
    xp_per_play: 15,
    available: true,
  },
  {
    id: "game-003",
    slug: "predictions",
    name: "Prédictions",
    description: "Prédit le succès des prochains événements",
    icon: "TrendingUp",
    color: "#06B6D4",
    highScore: null,
    playCount: 5,
    lastPlayed: "2024-12-10T12:00:00Z",
    xp_per_play: 25,
    available: true,
  },
  {
    id: "game-004",
    slug: "trivia",
    name: "Trivia TPM",
    description: "Questions sur l'univers Teens Party",
    icon: "HelpCircle",
    color: "#22C55E",
    highScore: 450,
    playCount: 12,
    lastPlayed: "2024-12-12T15:00:00Z",
    xp_per_play: 20,
    available: true,
  },
]

// ============================================================================
// COLLECTIONS
// ============================================================================

export const mockCollections = [
  {
    id: "coll-001",
    name: "DJs Légendaires",
    description: "Collecte les cartes des meilleurs DJs",
    total_items: 12,
    owned_items: 8,
    completion: 66,
    reward_xp: 500,
    reward_coins: 250,
    items: [
      { id: "c1", name: "DJ Snake", rarity: "legendary", owned: true, duplicate_count: 0 },
      { id: "c2", name: "David Guetta", rarity: "epic", owned: true, duplicate_count: 2 },
      { id: "c3", name: "Martin Garrix", rarity: "rare", owned: true, duplicate_count: 1 },
      { id: "c4", name: "Kygo", rarity: "rare", owned: false, duplicate_count: 0 },
      { id: "c5", name: "Avicii", rarity: "legendary", owned: false, duplicate_count: 0 },
    ],
  },
  {
    id: "coll-002",
    name: "Lieux Mythiques",
    description: "Les clubs les plus emblématiques",
    total_items: 8,
    owned_items: 8,
    completion: 100,
    reward_xp: 300,
    reward_coins: 150,
    completed: true,
    completed_at: "2024-05-01T12:00:00Z",
  },
]

export const mockPacks = [
  { id: "pack-001", name: "Pack Standard", price: 100, guaranteed_rarity: "common", cards_count: 3 },
  { id: "pack-002", name: "Pack Premium", price: 300, guaranteed_rarity: "rare", cards_count: 5 },
  { id: "pack-003", name: "Pack Légendaire", price: 1000, guaranteed_rarity: "epic", cards_count: 5 },
]

// ============================================================================
// VIP SYSTEM
// ============================================================================

export const mockVipStatus = {
  current_tier: {
    slug: "gold",
    name: "Gold",
    level: 4,
    color: "#FFD700",
    xp_multiplier: 1.3,
    coin_multiplier: 1.2,
    free_monthly_coins: 200,
    max_daily_wheel_spins: 3,
    discount_percentage: 15,
  },
  lifetime_xp: 12450,
  next_tier: {
    slug: "platinum",
    name: "Platinum",
    xp_required: 25000,
  },
  progress_to_next: 49.8,
  xp_to_next: 12550,
  monthly_coins_claimed: false,
  perks: [
    { name: "Multiplicateur XP x1.3", active: true },
    { name: "Multiplicateur Coins x1.2", active: true },
    { name: "200 Coins gratuits/mois", active: true },
    { name: "3 spins roue/jour", active: true },
    { name: "15% réduction boutique", active: true },
    { name: "Accès anticipé événements", active: true },
  ],
}

export const mockVipTiers = [
  { slug: "standard", name: "Standard", level: 0, xp_required: 0, color: "#71717A" },
  { slug: "bronze", name: "Bronze", level: 1, xp_required: 1000, color: "#CD7F32" },
  { slug: "silver", name: "Argent", level: 2, xp_required: 5000, color: "#C0C0C0" },
  { slug: "gold", name: "Or", level: 3, xp_required: 10000, color: "#FFD700" },
  { slug: "platinum", name: "Platine", level: 4, xp_required: 25000, color: "#E5E4E2" },
  { slug: "diamond", name: "Diamant", level: 5, xp_required: 50000, color: "#B9F2FF" },
  { slug: "legendary", name: "Légendaire", level: 6, xp_required: 100000, color: "#FF6B35" },
]

// ============================================================================
// ACTIVITY FEED
// ============================================================================

export const mockActivities = [
  {
    id: "act-001",
    user: { id: "u1", username: "DJMaster", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=DJMaster" },
    type: "badge_earned",
    title: "DJMaster a débloqué le badge Légende des Soirées",
    category: "achievement",
    likes_count: 24,
    comments_count: 5,
    liked_by_me: true,
    created_at: "2024-12-15T10:30:00Z",
  },
  {
    id: "act-002",
    user: { id: "u2", username: "NightQueen", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=NightQueen" },
    type: "event_attended",
    title: "NightQueen était à Neon Night Party",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400",
    category: "event",
    likes_count: 45,
    comments_count: 12,
    liked_by_me: false,
    created_at: "2024-12-14T23:00:00Z",
  },
  {
    id: "act-003",
    user: { id: "u3", username: "RaveStar", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=RaveStar" },
    type: "level_up",
    title: "RaveStar a atteint le niveau 33 !",
    category: "milestone",
    likes_count: 18,
    comments_count: 3,
    liked_by_me: true,
    created_at: "2024-12-14T18:45:00Z",
  },
  {
    id: "act-004",
    user: { id: "u4", username: "PartyKing", avatar_url: mockUser.avatar_url },
    type: "challenge_won",
    title: "PartyKing a battu ClubKing en duel Quiz Musical !",
    category: "game",
    likes_count: 12,
    comments_count: 2,
    liked_by_me: false,
    created_at: "2024-12-14T16:20:00Z",
  },
]

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export const mockNotifications = [
  {
    id: "notif-001",
    type: "challenge_received",
    title: "Nouveau défi !",
    message: "DJMaster t'a défié en Quiz Musical",
    icon: "Zap",
    color: "#8B5CF6",
    read: false,
    has_reward: false,
    created_at: "2024-12-15T11:00:00Z",
  },
  {
    id: "notif-002",
    type: "badge_earned",
    title: "Badge débloqué !",
    message: "Tu as obtenu le badge Semaine de Feu",
    icon: "Award",
    color: "#FFD700",
    read: false,
    has_reward: true,
    reward: { xp: 75, coins: 0 },
    created_at: "2024-12-15T08:00:00Z",
  },
  {
    id: "notif-003",
    type: "friend_activity",
    title: "Activité d'ami",
    message: "NightQueen a assisté à Neon Night Party",
    icon: "Users",
    color: "#06B6D4",
    read: true,
    has_reward: false,
    created_at: "2024-12-14T23:05:00Z",
  },
  {
    id: "notif-004",
    type: "mission_completed",
    title: "Mission complétée !",
    message: "Tu as complété la mission hebdomadaire",
    icon: "CheckCircle",
    color: "#22C55E",
    read: true,
    has_reward: true,
    reward: { xp: 100, coins: 50 },
    reward_claimed: true,
    created_at: "2024-12-14T20:00:00Z",
  },
]

// ============================================================================
// WRAPPED (Annual Stats)
// ============================================================================

export const mockWrapped = {
  year: 2024,
  user: mockUser,
  stats: {
    total_events: 18,
    total_xp: 12450,
    total_coins_earned: 8500,
    total_coins_spent: 5000,
    challenges_won: 32,
    challenges_lost: 13,
    badges_earned: 12,
    friends_made: 45,
    games_played: 89,
    highest_streak: 21,
    top_percentile: 8, // Top 8%
  },
  highlights: {
    favorite_event: "Summer Beach Party",
    most_played_game: "Quiz Musical",
    best_friend: "DJMaster",
    rarest_badge: "Légende des Soirées",
    biggest_win: { opponent: "ClubKing", game: "Memory", margin: 350 },
  },
  comparisons: {
    events_vs_avg: "+45%",
    xp_vs_avg: "+120%",
    social_vs_avg: "+85%",
  },
  milestones: [
    { month: "Janvier", event: "Première connexion" },
    { month: "Mars", event: "50 amis atteints" },
    { month: "Mai", event: "Collection complétée" },
    { month: "Juillet", event: "Tier Gold atteint" },
    { month: "Octobre", event: "Top 10 leaderboard" },
  ],
}

// ============================================================================
// REFERRAL
// ============================================================================

export const mockReferral = {
  code: "TPMKING42",
  total_uses: 12,
  successful_conversions: 8,
  total_rewards_earned: { xp: 800, coins: 400 },
  referred_users: [
    { username: "NewPartyFan", status: "completed", joined_at: "2024-11-20T00:00:00Z" },
    { username: "ClubNewbie", status: "completed", joined_at: "2024-10-15T00:00:00Z" },
    { username: "FreshDancer", status: "pending", joined_at: "2024-12-10T00:00:00Z" },
  ],
}
