/**
 * TEENS PARTY MOROCCO - Mini Games Feature
 * =========================================
 *
 * Export centralisé de la feature Mini Games.
 */

// Schema & Types
export {
  // Enums
  GameTypeSlugEnum,
  GameSessionStatusEnum,
  QuizDifficultyEnum,
  QuestionTypeEnum,
  PredictionStatusEnum,
  // Config
  GAME_TYPE_CONFIG,
  DIFFICULTY_CONFIG,
  // Schemas
  MiniGameTypeSchema,
  GameSessionSchema,
  GameParticipantSchema,
  MusicQuizQuestionSchema,
  MemoryCardSchema,
  PredictionQuestionSchema,
  UserPredictionSchema,
  DailyGameScoreSchema,
  LeaderboardEntrySchema,
  // Types
  type MiniGameType,
  type GameSession,
  type GameParticipant,
  type MusicQuizQuestion,
  type MemoryCard,
  type PredictionQuestion,
  type UserPrediction,
  type DailyGameScore,
  type LeaderboardEntry,
  type GameSessionWithDetails,
  type QuizGameState,
  type MemoryGameState,
  type PredictionQuestionWithUserPrediction,
  // Helpers
  calculateTimeBonus,
  shuffleArray,
  generateMemoryDeck,
  calculateMemoryScore,
  formatGameTime,
  getResultMessage,
  calculateGameXp,
  isCooldownActive,
  generatePredictionOptions,
} from "./schema"

// Actions
export {
  // Types de jeux
  getMiniGameTypes,
  getGameTypeBySlug,
  // Sessions
  createGameSession,
  joinGameSession,
  startGameSession,
  submitGameScore,
  endGameSession,
  getGameSession,
  // Quiz
  getRandomQuizQuestions,
  checkQuizAnswer,
  // Memory
  getMemoryCards,
  // Prédictions
  getOpenPredictions,
  makePrediction,
  getUserPredictionResults,
  // Leaderboards
  getGameLeaderboard,
  getUserDailyScores,
  getUserGameStats,
} from "./actions"
