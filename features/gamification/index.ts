/**
 * TEENS PARTY MOROCCO - Gamification Domain
 * =========================================
 *
 * Export centralisé du domaine Gamification.
 */

// Schemas & Types
export * from './schema'

// Actions
export {
  getTeenXP,
  getTeenXPHistory,
  addXP,
  getTeenStreak,
  getChallengeTemplates,
  getDailyChallenges,
  assignDailyChallenges,
  completeChallenge,
  skipChallenge,
  getTeenGamificationStats,
  getXPLeaderboard,
  createChallengeTemplate,
  updateChallengeTemplate,
} from './actions'
