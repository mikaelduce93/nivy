/**
 * TEENS PARTY MOROCCO - Gamification System
 * ==========================================
 *
 * Point d'entrée centralisé pour tout le système de gamification.
 * Ce fichier exporte tous les modules disponibles.
 *
 * @version 1.0.0
 * @author Teens Party Morocco
 */

/* ==========================================================================
   FEATURES - Server Actions & Business Logic
   ========================================================================== */

// Badges & Achievements
export * as Achievements from "./features/achievements"

// Leaderboard
export * as Leaderboard from "./features/leaderboard"

// Missions & Quêtes
export * as Missions from "./features/missions"

// Boutique de Récompenses
export * as Shop from "./features/shop"

// Roue de la Fortune
export * as Wheel from "./features/wheel"

// Défis entre Amis
export * as Challenges from "./features/challenges"

// Système de Crews
export * as Crews from "./features/crews"

// Types de Défis (Photo, Quiz, Géoloc, Flash)
export * as SpecialChallenges from "./features/special-challenges"

// Défis Événementiels
export * as EventChallenges from "./features/event-challenges"

// Défis Saisonniers & Calendrier de l'Avent
export * as SeasonalChallenges from "./features/seasonal-challenges"

// Mini-Jeux
export * as MiniGames from "./features/mini-games"

// Dashboard de Statistiques
export * as StatsDashboard from "./features/stats-dashboard"

// Wrapped Annuel
export * as AnnualWrapped from "./features/annual-wrapped"

// Personnalisation de Profil
export * as ProfileCustomization from "./features/profile-customization"

// Collections
export * as Collections from "./features/collections"

// Notifications Gamifiées
export * as Notifications from "./features/notifications"

// Système VIP
export * as VipSystem from "./features/vip-system"

// Fil d'Activité Social
export * as ActivityFeed from "./features/activity-feed"

// Partage Social
export * as SocialSharing from "./features/social-sharing"

/* ==========================================================================
   COMPONENTS - React UI Components
   ========================================================================== */

// Note: Les composants sont exportés depuis leurs dossiers respectifs
// Utiliser: import { ComponentName } from "./gamification-system/components/[module]"

/* ==========================================================================
   DATABASE - SQL Migrations Reference
   ========================================================================== */

/**
 * Migrations disponibles (à exécuter dans l'ordre):
 *
 * 001_badges.sql - Système de badges et achievements
 * 002_leaderboard.sql - Classements et rankings
 * 003_missions.sql - Missions hebdomadaires/mensuelles/saisonnières
 * 004_rewards_shop.sql - Boutique de récompenses
 * 005_fortune_wheel.sql - Roue de la fortune quotidienne
 * 006_challenges.sql - Défis entre amis (duels, teams)
 * 007_crews.sql - Système de crews/groupes
 * 008_challenge_types.sql - Types de défis avancés
 * 009_event_challenges.sql - Défis liés aux événements
 * 010_seasonal_challenges.sql - Défis saisonniers
 * 011_mini_games.sql - Mini-jeux
 * 012_stats_dashboard.sql - Statistiques personnelles
 * 013_wrapped.sql - Wrapped annuel
 * 014_profile_customization.sql - Personnalisation de profil
 * 015_collections.sql - Système de collections
 * 016_gamified_notifications.sql - Notifications gamifiées
 * 017_vip_system.sql - Système VIP
 * 018_activity_feed.sql - Fil d'activité social
 * 019_social_sharing.sql - Partage sur réseaux sociaux
 */

/* ==========================================================================
   TYPES UTILITAIRES
   ========================================================================== */

/**
 * Type générique pour les réponses d'actions
 */
export interface ActionResponse<T = void> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Type pour la pagination
 */
export interface PaginationParams {
  limit?: number
  offset?: number
}

/**
 * Type pour les résultats paginés
 */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  hasMore: boolean
}

/**
 * Type pour les filtres de date
 */
export type DateFilter = "today" | "week" | "month" | "year" | "all"

/**
 * Type pour les ordres de tri
 */
export type SortOrder = "asc" | "desc"

/* ==========================================================================
   CONSTANTS
   ========================================================================== */

/**
 * Configuration globale du système de gamification
 */
export const GAMIFICATION_CONFIG = {
  // XP
  BASE_XP_PER_ACTION: 10,
  XP_MULTIPLIER_CAP: 3.0,

  // Niveaux
  MAX_LEVEL: 100,
  XP_PER_LEVEL_BASE: 100,
  XP_LEVEL_SCALING: 1.15,

  // Streaks
  MAX_STREAK_MULTIPLIER: 2.0,
  STREAK_BONUS_XP: 50,

  // Roue de la fortune
  DEFAULT_DAILY_SPINS: 1,
  VIP_BONUS_SPINS: 2,

  // Collections
  DUPLICATE_TRADE_VALUE: 0.5,
  RARE_DROP_CHANCE: 0.1,

  // Social
  MAX_FRIENDS: 500,
  MAX_CREW_SIZE_BASE: 10,

  // Notifications
  NOTIFICATION_RETENTION_DAYS: 30,

  // Partage
  SHARE_XP_REWARD: 15,
  SHARE_COINS_REWARD: 10,
  FIRST_SHARE_BONUS: 25,

  // VIP
  VIP_XP_BONUS_PERCENT: 10, // Par niveau VIP
  VIP_COIN_BONUS_PERCENT: 5,
} as const

/**
 * Points d'XP par action
 */
export const XP_REWARDS = {
  // Événements
  EVENT_ATTENDANCE: 100,
  EVENT_CHECKIN: 25,
  EVENT_REVIEW: 50,
  EVENT_PHOTO: 30,

  // Social
  ADD_FRIEND: 15,
  JOIN_CREW: 25,
  CREATE_CREW: 50,
  INVITE_FRIEND: 20,

  // Défis
  CHALLENGE_COMPLETE: 75,
  CHALLENGE_WIN: 100,
  DAILY_CHALLENGE: 30,
  WEEKLY_CHALLENGE: 150,

  // Collections
  COLLECT_ITEM: 10,
  COMPLETE_SET: 200,
  TRADE_COMPLETE: 15,

  // Jeux
  GAME_PLAY: 20,
  GAME_WIN: 50,
  HIGH_SCORE: 100,

  // Engagement
  DAILY_LOGIN: 10,
  STREAK_BONUS: 5, // Par jour de streak
  SHARE_CONTENT: 15,

  // Achats
  SHOP_PURCHASE: 25,
  VIP_UPGRADE: 500,
} as const

/**
 * Couleurs thématiques
 */
export const THEME_COLORS = {
  primary: "#06B6D4", // Cyan
  secondary: "#8B5CF6", // Purple
  success: "#22C55E", // Green
  warning: "#F59E0B", // Amber
  danger: "#EF4444", // Red
  info: "#3B82F6", // Blue

  // VIP Tiers
  standard: "#71717A",
  bronze: "#CD7F32",
  silver: "#C0C0C0",
  gold: "#FFD700",
  platinum: "#E5E4E2",
  diamond: "#B9F2FF",
  legendary: "#FF6B35",
} as const
