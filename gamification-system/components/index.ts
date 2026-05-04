/**
 * TEENS PARTY MOROCCO - Gamification Components
 * ==============================================
 *
 * Export centralisé de tous les composants de gamification.
 */

// NOTE:
// Ce fichier exportait auparavant tout via `export *`, ce qui provoquait des
// collisions de noms (ex: PendingInvitations, CompactChallengeCard, etc.)
// et cassait le build TypeScript. On expose désormais des namespaces explicites.

export * as Achievements from "./achievements"
export * as Leaderboard from "./leaderboard"
export * as Missions from "./missions"
export * as Shop from "./shop"
export * as Wheel from "./wheel"
export * as Challenges from "./challenges"
export * as Crews from "./crews"
export * as SpecialChallenges from "./special-challenges"
export * as EventChallenges from "./event-challenges"
export * as SeasonalChallenges from "./seasonal-challenges"
export * as MiniGames from "./mini-games"
export * as StatsDashboard from "./stats-dashboard"
export * as AnnualWrapped from "./annual-wrapped"
export * as ProfileCustomization from "./profile-customization"
export * as Collections from "./collections"
export * as Notifications from "./notifications"
export * as VipSystem from "./vip-system"
export * as ActivityFeed from "./activity-feed"
export * as SocialSharing from "./social-sharing"
