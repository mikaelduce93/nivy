/**
 * Script de test pour la génération de quiz
 * Teste les nouveaux systèmes : prompts enrichis, intégration intérêts, parser JSON, validation factuelle
 */

import { EnhancedQuizPrompts, type GenerationParams, type TeenContext } from "./enhanced-quiz-prompts"
import { InterestIntegration } from "./interest-integration"
import { SmartJSONParser } from "./smart-json-parser"
import { FactualValidator } from "./factual-validator"

/**
 * Test 1: Prompts enrichis
 */
export function testEnhancedPrompts() {
  console.log("🧪 TEST 1: Prompts enrichis")
  console.log("=" .repeat(50))

  const params: GenerationParams = {
    gradeLevel: "3ème",
    subject: "Mathématiques",
    difficulty: "normal",
    interests: ["Football", "Jeux vidéo"]
  }

  const teenContext: TeenContext = {
    averageScore: 65,
    completedQuizzes: 10,
    favoriteSubjects: ["Mathématiques"],
    weakSubjects: ["Histoire"]
  }

  const systemPrompt = EnhancedQuizPrompts.getSystemPrompt()
  const userPrompt = EnhancedQuizPrompts.buildUserPrompt(params, teenContext)

  console.log("\n📝 Prompt système (extrait):")
  console.log(systemPrompt.substring(0, 200) + "...")
  
  console.log("\n📝 Prompt utilisateur (extrait):")
  console.log(userPrompt.substring(0, 300) + "...")

  // Vérifier que le prompt contient les instructions en français
  const hasFrenchInstruction = systemPrompt.includes("FRANÇAIS") || systemPrompt.includes("français")
  const hasMoroccanContext = systemPrompt.includes("marocain") || systemPrompt.includes("Maroc")
  const hasInterests = userPrompt.includes("Football") || userPrompt.includes("Jeux vidéo")

  console.log("\n✅ Vérifications:")
  console.log(`- Instructions français: ${hasFrenchInstruction ? "✅" : "❌"}`)
  console.log(`- Contexte marocain: ${hasMoroccanContext ? "✅" : "❌"}`)
  console.log(`- Intérêts intégrés: ${hasInterests ? "✅" : "❌"}`)

  return hasFrenchInstruction && hasMoroccanContext && hasInterests
}

/**
 * Test 2: Intégration des intérêts
 */
export function testInterestIntegration() {
  console.log("\n🧪 TEST 2: Intégration des intérêts")
  console.log("=" .repeat(50))

  const params: GenerationParams = {
    gradeLevel: "3ème",
    difficulty: "normal",
    interests: ["Football", "K-Pop"]
  }

  const enhancedParams = InterestIntegration.integrateInterests(
    params,
    params.interests || []
  )

  console.log("\n📊 Paramètres originaux:")
  console.log(JSON.stringify(params, null, 2))

  console.log("\n📊 Paramètres enrichis:")
  console.log(JSON.stringify(enhancedParams, null, 2))

  // Vérifier que les intérêts sont intégrés
  const hasCustomPrompt = !!enhancedParams.customPrompt
  const hasSubject = !!enhancedParams.subject

  console.log("\n✅ Vérifications:")
  console.log(`- Prompt personnalisé créé: ${hasCustomPrompt ? "✅" : "❌"}`)
  console.log(`- Matière suggérée: ${hasSubject ? "✅" : "❌"}`)

  // Tester les suggestions de matières
  const suggestedSubjects = InterestIntegration.suggestSubjects(["Football", "K-Pop"])
  console.log(`\n📚 Matières suggérées: ${suggestedSubjects.join(", ")}`)

  return hasCustomPrompt && hasSubject
}

/**
 * Test 3: Parser JSON robuste
 */
export function testJSONParser() {
  console.log("\n🧪 TEST 3: Parser JSON robuste")
  console.log("=" .repeat(50))

  const parser = new SmartJSONParser()

  // Test 1: JSON valide
  const validJSON = `{
    "title": "Quiz de Mathématiques",
    "description": "Test de quiz",
    "subject": "Mathématiques",
    "difficulty": "normal",
    "grade_level": "3ème",
    "questions": [
      {
        "type": "multiple_choice",
        "question": "Quelle est la solution de 2x + 5 = 13 ?",
        "options": ["x = 4", "x = 5", "x = 6", "x = 7"],
        "correct": 0,
        "explanation": "On soustrait 5: 2x = 8, puis on divise par 2: x = 4"
      }
    ],
    "time_limit_minutes": 15,
    "passing_score": 60,
    "xp_reward": 50
  }`

  const parsed1 = parser.parseQuizResponse(validJSON, {
    gradeLevel: "3ème",
    difficulty: "normal",
    subject: "Mathématiques"
  })

  console.log("\n✅ Test 1: JSON valide")
  console.log(`- Parsé avec succès: ${parsed1 ? "✅" : "❌"}`)
  if (parsed1) {
    console.log(`- Titre: ${parsed1.title}`)
    console.log(`- Questions: ${parsed1.questions.length}`)
  }

  // Test 2: JSON avec markdown
  const jsonWithMarkdown = `\`\`\`json
${validJSON}
\`\`\``

  const parsed2 = parser.parseQuizResponse(jsonWithMarkdown, {
    gradeLevel: "3ème",
    difficulty: "normal",
    subject: "Mathématiques"
  })

  console.log("\n✅ Test 2: JSON avec markdown")
  console.log(`- Parsé avec succès: ${parsed2 ? "✅" : "❌"}`)

  // Test 3: JSON avec texte autour
  const jsonWithText = `Voici le quiz demandé:
${validJSON}

J'espère que cela vous convient.`

  const parsed3 = parser.parseQuizResponse(jsonWithText, {
    gradeLevel: "3ème",
    difficulty: "normal",
    subject: "Mathématiques"
  })

  console.log("\n✅ Test 3: JSON avec texte autour")
  console.log(`- Parsé avec succès: ${parsed3 ? "✅" : "❌"}`)

  return parsed1 !== null && parsed2 !== null && parsed3 !== null
}

/**
 * Test 4: Validation factuelle
 */
export function testFactualValidator() {
  console.log("\n🧪 TEST 4: Validation factuelle")
  console.log("=" .repeat(50))

  const validator = new FactualValidator()

  // Test avec un quiz valide
  const validQuiz = {
    title: "Quiz de Mathématiques - Niveau 3ème",
    description: "Quiz sur les équations et la géométrie, adapté au programme marocain",
    subject: "Mathématiques",
    difficulty: "normal",
    grade_level: "3ème",
    questions: [
      {
        type: "multiple_choice",
        question: "Quelle est la solution de l'équation 2x + 5 = 13 ?",
        options: ["x = 4", "x = 5", "x = 6", "x = 7"],
        correct: 0,
        explanation: "Pour résoudre 2x + 5 = 13, on soustrait 5 des deux côtés: 2x = 8, puis on divise par 2: x = 4."
      },
      {
        type: "true_false",
        question: "Un triangle rectangle a toujours un angle de 90 degrés.",
        correct: true,
        explanation: "Par définition, un triangle rectangle possède exactement un angle droit (90 degrés)."
      }
    ],
    time_limit_minutes: 15,
    passing_score: 60,
    xp_reward: 50
  }

  const validation = validator.heuristicVerification(validQuiz)

  console.log("\n✅ Validation du quiz:")
  console.log(`- Score global: ${validation.overall}/100`)
  console.log(`- Est valide: ${validation.isValid ? "✅" : "❌"}`)
  console.log(`- Erreurs: ${validation.errors.length}`)
  console.log(`- Avertissements: ${validation.warnings.length}`)

  // Test avec un quiz invalide (question trop courte)
  const invalidQuiz = {
    ...validQuiz,
    questions: [
      {
        type: "multiple_choice",
        question: "Test?", // Trop court
        options: ["A", "B"],
        correct: 0,
        explanation: "Explication"
      }
    ]
  }

  const validationInvalid = validator.heuristicVerification(invalidQuiz)

  console.log("\n✅ Validation du quiz invalide:")
  console.log(`- Score global: ${validationInvalid.overall}/100`)
  console.log(`- Est valide: ${validationInvalid.isValid ? "✅" : "❌"}`)
  console.log(`- Erreurs: ${validationInvalid.errors.length}`)

  return validation.isValid && !validationInvalid.isValid
}

/**
 * Test 5: Vérification langue française
 */
export function testFrenchLanguageCheck() {
  console.log("\n🧪 TEST 5: Vérification langue française")
  console.log("=" .repeat(50))

  const validator = new FactualValidator()

  // Test avec texte en français
  const frenchText = "Quelle est la solution de l'équation 2x + 5 = 13 ?"
  const frenchCheck = (validator as any).checkFrenchLanguage(frenchText)

  console.log("\n✅ Test texte français:")
  console.log(`- Texte: "${frenchText}"`)
  console.log(`- Est en français: ${frenchCheck.isFrench ? "✅" : "❌"}`)

  // Test avec texte en anglais
  const englishText = "What is the solution of the equation 2x + 5 = 13?"
  const englishCheck = (validator as any).checkFrenchLanguage(englishText)

  console.log("\n✅ Test texte anglais:")
  console.log(`- Texte: "${englishText}"`)
  console.log(`- Est en français: ${englishCheck.isFrench ? "✅" : "❌"}`)

  // Test avec texte mixte
  const mixedText = "What is the solution? Quelle est la solution?"
  const mixedCheck = (validator as any).checkFrenchLanguage(mixedText)

  console.log("\n✅ Test texte mixte:")
  console.log(`- Texte: "${mixedText}"`)
  console.log(`- Est en français: ${mixedCheck.isFrench ? "✅" : "❌"}`)

  return frenchCheck.isFrench && !englishCheck.isFrench
}

/**
 * Exécute tous les tests
 */
export async function runAllTests() {
  console.log("\n🚀 DÉMARRAGE DES TESTS")
  console.log("=" .repeat(50))

  const results = {
    test1: testEnhancedPrompts(),
    test2: testInterestIntegration(),
    test3: testJSONParser(),
    test4: testFactualValidator(),
    test5: testFrenchLanguageCheck()
  }

  console.log("\n" + "=" .repeat(50))
  console.log("📊 RÉSULTATS FINAUX")
  console.log("=" .repeat(50))

  const totalTests = Object.keys(results).length
  const passedTests = Object.values(results).filter(r => r).length

  console.log(`\n✅ Tests réussis: ${passedTests}/${totalTests}`)
  console.log(`\nDétails:`)
  console.log(`- Test 1 (Prompts enrichis): ${results.test1 ? "✅" : "❌"}`)
  console.log(`- Test 2 (Intégration intérêts): ${results.test2 ? "✅" : "❌"}`)
  console.log(`- Test 3 (Parser JSON): ${results.test3 ? "✅" : "❌"}`)
  console.log(`- Test 4 (Validation factuelle): ${results.test4 ? "✅" : "❌"}`)
  console.log(`- Test 5 (Vérification français): ${results.test5 ? "✅" : "❌"}`)

  if (passedTests === totalTests) {
    console.log("\n🎉 TOUS LES TESTS SONT PASSÉS !")
  } else {
    console.log("\n⚠️ Certains tests ont échoué. Vérifiez les détails ci-dessus.")
  }

  return results
}

// Si exécuté directement (pour test manuel)
if (require.main === module) {
  runAllTests().catch(console.error)
}



