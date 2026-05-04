/**
 * TEENS PARTY MOROCCO - Special Challenges Feature
 * =================================================
 *
 * Export principal du module défis spéciaux.
 */

// Schema exports
export {
  // Enums
  ChallengeCategoryEnum,
  SpecialChallengeStatusEnum,
  QuestionTypeEnum,
  QuizDifficultyEnum,
  QuizCategoryEnum,
  // Types
  type ChallengeCategory,
  type SpecialChallengeStatus,
  type QuestionType,
  type QuizDifficulty,
  type QuizCategory,
  type SpecialChallengeType,
  type SpecialChallenge,
  type ChallengeSubmission,
  type QuizQuestion,
  type QuizAnswer,
  type GeolocationZone,
  type PhotoSubmissionInput,
  type QuizSubmissionInput,
  type GeolocationSubmissionInput,
  // Config
  CHALLENGE_CATEGORY_CONFIG,
  CHALLENGE_STATUS_CONFIG,
  QUIZ_DIFFICULTY_CONFIG,
  QUIZ_CATEGORY_CONFIG,
  // Schemas
  SpecialChallengeTypeSchema,
  SpecialChallengeSchema,
  ChallengeSubmissionSchema,
  QuizQuestionSchema,
  QuizAnswerSchema,
  GeolocationZoneSchema,
  PhotoSubmissionInputSchema,
  QuizSubmissionInputSchema,
  GeolocationSubmissionInputSchema,
  // Helpers
  formatTimeRemaining,
  calculateQuizScore,
  isInZone,
  calculateDistance,
  getQuizResultMessage,
  sortSubmissionsByVotes,
  sortSubmissionsByScore,
  isFlashChallengeActive,
} from "./schema"

// Action exports
export {
  getSpecialChallengeTypes,
  getActiveSpecialChallenges,
  getFlashChallenges,
  getSpecialChallengeDetails,
  submitPhoto,
  getQuizQuestions,
  submitQuizAnswers,
  submitGeolocation,
  voteOnSubmission,
  getGeolocationZones,
  getUserChallengeHistory,
  getChallengeLeaderboard,
} from "./actions"
