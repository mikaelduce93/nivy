/**
 * Enhanced Quiz Prompts
 * Prompts professionnels pour génération de quiz de qualité
 * Adaptés au contexte marocain et personnalisés
 */

export interface GenerationParams {
  contentType?: string
  category?: string
  gradeLevel?: string
  difficulty?: "easy" | "normal" | "hard" | "expert"
  interests?: string[]
  profiles?: string[]
  subject?: string
  count?: number
  customPrompt?: string
}

export interface TeenContext {
  averageScore?: number
  completedQuizzes?: number
  favoriteSubjects?: string[]
  weakSubjects?: string[]
}

export interface GeneratedQuiz {
  title: string
  description: string
  subject: string
  difficulty: string
  grade_level?: string
  questions: Array<{
    type?: string
    question: string
    options?: string[]
    correct: number | boolean | number[]
    explanation?: string
  }>
  time_limit_minutes: number
  passing_score: number
  xp_reward: number
}

export class EnhancedQuizPrompts {
  /**
   * Prompt système enrichi avec contexte marocain
   */
  static getSystemPrompt(): string {
    return `Tu es un expert en création de quiz éducatifs pour adolescents marocains de 13 à 17 ans.

LANGUE OBLIGATOIRE (V1 — strictement français):
- TOUT le contenu doit être en FRANÇAIS standard (titre, description, questions, options, explications).
- Pas d'anglais, pas de Darija, pas d'arabe classique dans le quiz.
- Seuls les noms propres marocains (villes, plats, personnalités) peuvent garder leur orthographe locale francisée.
- Vocabulaire clair, accessible à un ado de 13 ans, jamais infantilisant.

TON ET REGISTRE:
- Adresse l'élève comme un ado curieux, pas un enfant. Tutoiement neutre, pas d'argot, pas d'emoji.
- Encourageant mais factuel. Pas de pression, pas de jugement, pas de comparaison sociale.
- Pas de FOMO ("dépêche-toi", "dernière chance"), pas de culpabilisation.

SENSIBILITÉ CULTURELLE MAROCAINE:
- Respecte l'islam comme cadre culturel majoritaire au Maroc: aucune référence à l'alcool, au porc,
  aux jeux d'argent, ou à des pratiques contraires au halal dans les exemples.
- N'utilise pas de monarchie / Sahara / partis politiques / religion comme sujet de quiz.
- Pour des questions historiques sur des dynasties, des guerres, ou la colonisation, reste factuel et neutre,
  sans glorifier la violence ni stigmatiser un groupe.
- Évite les références sportives à des matchs où le Maroc a perdu (ne pas démoraliser l'ado).
- Pas de stéréotypes de genre, de classe sociale, ni de région.

SÉCURITÉ JEUNES (13-17 ans):
- Aucune mention de sexe, de drogue, d'alcool, de violence graphique, d'automutilation, de suicide,
  de jeux d'argent, de régime restrictif, ou de défi physique extrême.
- Aucune incitation à rencontrer des inconnus hors-ligne.
- Si le programme scolaire impose un sujet sensible (ex: biologie de la reproduction, opium dans
  une question d'histoire), reformule en termes scientifiques neutres adaptés à l'âge.

QUALITÉ PÉDAGOGIQUE:
- Questions claires, sans ambiguïté, alignées au programme scolaire marocain.
- Options plausibles, distracteurs cohérents (pas de "je ne sais pas", "toutes les réponses").
- Explications pédagogiques détaillées qui apprennent, pas qui jugent.
- Difficulté progressive du quiz.
- Test de compréhension, pas de simple mémorisation.

FORMAT (strict):
- Réponds UNIQUEMENT avec un JSON valide UTF-8.
- Pas de texte avant/après, pas de markdown, pas de code blocks.
- TOUT le contenu textuel en français.
- Structure exacte du prompt utilisateur.`
  }

  /**
   * Construit un prompt utilisateur détaillé et personnalisé
   */
  static buildUserPrompt(
    params: GenerationParams,
    teenContext?: TeenContext
  ): string {
    const parts: string[] = []

    // En-tête
    parts.push(`Génère un quiz éducatif de qualité professionnelle avec les caractéristiques suivantes:`)
    parts.push(``)
    parts.push(`⚠️ IMPORTANT - LANGUE:`)
    parts.push(`TOUT le contenu doit être en FRANÇAIS:`)
    parts.push(`- Titre en français`)
    parts.push(`- Description en français`)
    parts.push(`- Toutes les questions en français`)
    parts.push(`- Toutes les options en français`)
    parts.push(`- Toutes les explications en français`)
    parts.push(`- Pas d'anglais, pas de darija dans le quiz`)
    parts.push(``)

    // Niveau scolaire avec contexte marocain
    if (params.gradeLevel) {
      const gradeContext = this.getGradeContext(params.gradeLevel)
      parts.push(`📚 NIVEAU SCOLAIRE: ${params.gradeLevel}`)
      parts.push(`   Contexte: ${gradeContext}`)
      parts.push(`   Adapte le vocabulaire et la complexité à ce niveau.`)
      parts.push(``)
    }

    // Matière avec programme marocain
    if (params.subject) {
      const subjectContext = this.getSubjectContext(params.subject)
      parts.push(`📖 MATIÈRE: ${params.subject}`)
      parts.push(`   Programme: ${subjectContext}`)
      parts.push(`   Crée des questions alignées avec le programme marocain.`)
      parts.push(``)
    }

    // Difficulté avec spécifications détaillées
    if (params.difficulty) {
      const difficultySpec = this.getDifficultySpec(params.difficulty)
      parts.push(`⚡ DIFFICULTÉ: ${params.difficulty.toUpperCase()}`)
      parts.push(`   ${difficultySpec}`)
      parts.push(``)
    }

    // Intérêts intégrés intelligemment
    if (params.interests && params.interests.length > 0) {
      parts.push(`🎯 INTÉRÊTS DE L'ADO: ${params.interests.join(", ")}`)
      parts.push(`   INSTRUCTION CRITIQUE: Intègre ces intérêts dans les questions quand c'est pertinent.`)
      parts.push(`   Exemples d'intégration:`)
      
      params.interests.forEach(interest => {
        const examples = this.getInterestExamples(interest, params.subject)
        if (examples.length > 0) {
          parts.push(`   - ${interest}: ${examples.join(" | ")}`)
        }
      })
      
      parts.push(`   Cela rendra le quiz plus engageant et pertinent pour l'ado.`)
      parts.push(``)
    }

    // Performance passée pour adaptation
    if (teenContext?.averageScore !== undefined) {
      parts.push(`📊 PERFORMANCE MOYENNE: ${teenContext.averageScore}%`)
      parts.push(`   Adapte la difficulté pour être légèrement au-dessus (objectif: ${Math.min(100, teenContext.averageScore + 10)}%).`)
      parts.push(`   L'ado doit être challengé mais pas découragé.`)
      parts.push(``)
    }

    // Matières faibles pour révision
    if (teenContext?.weakSubjects && teenContext.weakSubjects.length > 0) {
      parts.push(`⚠️ MATIÈRES À RENFORCER: ${teenContext.weakSubjects.join(", ")}`)
      parts.push(`   Si la matière du quiz correspond, crée des questions de révision adaptées.`)
      parts.push(``)
    }

    // Types de questions variés
    parts.push(`🎲 TYPES DE QUESTIONS REQUIS:`)
    parts.push(`   - 60% QCM classiques (4 options, 1 bonne réponse)`)
    parts.push(`   - 20% Vrai/Faux (avec explication détaillée)`)
    parts.push(`   - 10% Questions à plusieurs bonnes réponses (2-3 bonnes réponses)`)
    parts.push(`   - 10% Questions d'ordre/chronologie (si applicable à la matière)`)
    parts.push(``)

    // Structure JSON détaillée
    parts.push(`📋 FORMAT JSON EXACT REQUIS:`)
    parts.push(JSON.stringify(this.getExampleQuiz(), null, 2))
    parts.push(``)
    parts.push(`IMPORTANT:`)
    parts.push(`- Le JSON doit être valide et parsable`)
    parts.push(`- TOUT doit être en FRANÇAIS (titre, questions, options, explications)`)
    parts.push(`- Toutes les questions doivent avoir un type spécifié`)
    parts.push(`- Les explications sont obligatoires pour chaque question (en français)`)
    parts.push(`- Le nombre de questions doit être entre 5 et 10`)
    parts.push(`- La difficulté doit progresser (premières questions plus faciles)`)
    parts.push(`- Utilise des exemples marocains quand c'est pertinent (villes, événements, culture)`)

    return parts.join("\n")
  }

  /**
   * Contexte du niveau scolaire marocain
   */
  private static getGradeContext(grade: string): string {
    const contexts: Record<string, string> = {
      "CP": "Cours Préparatoire - 6-7 ans - Apprentissage de base",
      "CE1": "Cours Élémentaire 1 - 7-8 ans - Fondamentaux",
      "CE2": "Cours Élémentaire 2 - 8-9 ans - Consolidation",
      "CM1": "Cours Moyen 1 - 9-10 ans - Approfondissement",
      "CM2": "Cours Moyen 2 - 10-11 ans - Préparation collège",
      "6ème": "Collège - 11-12 ans - Programme marocain - Adaptation",
      "5ème": "Collège - 12-13 ans - Programme marocain - Consolidation",
      "4ème": "Collège - 13-14 ans - Programme marocain - Approfondissement",
      "3ème": "Collège - 14-15 ans - Programme marocain - Brevet",
      "2nde": "Lycée - 15-16 ans - Programme marocain - Orientation",
      "1ère": "Lycée - 16-17 ans - Programme marocain - Spécialisation",
      "Terminale": "Lycée - 17-18 ans - Programme marocain - Préparation Bac",
    }
    return contexts[grade] || `${grade} - Programme marocain`
  }

  /**
   * Contexte de la matière avec programme marocain
   */
  private static getSubjectContext(subject: string): string {
    const contexts: Record<string, string> = {
      "Mathématiques": "Programme marocain - Algèbre, Géométrie, Statistiques, Probabilités",
      "Sciences": "Programme marocain - SVT, Physique-Chimie, Sciences de la vie",
      "Histoire": "Histoire du Maroc (préférence) et Histoire générale",
      "Géographie": "Géographie du Maroc (préférence) et Géographie générale",
      "Français": "Langue française - Grammaire, Littérature, Expression écrite et orale",
      "Arabe": "Langue arabe - Grammaire, Littérature, Expression écrite et orale",
      "Anglais": "Langue anglaise - Grammaire, Vocabulaire, Expression, Communication",
      "Éducation Islamique": "Programme marocain - Coran, Hadith, Fiqh, Histoire islamique",
      "Éducation Civique": "Programme marocain - Citoyenneté, Institutions marocaines",
    }
    return contexts[subject] || `${subject} - Programme marocain`
  }

  /**
   * Spécifications de difficulté détaillées
   */
  private static getDifficultySpec(difficulty: string): string {
    const specs: Record<string, string> = {
      "easy": "Questions simples, connaissances de base, vocabulaire accessible, 70% de réussite attendue",
      "normal": "Questions moyennes, compréhension requise, vocabulaire standard, 60% de réussite attendue",
      "hard": "Questions complexes, analyse et synthèse requises, vocabulaire avancé, 50% de réussite attendue",
      "expert": "Questions très complexes, réflexion critique, vocabulaire spécialisé, 40% de réussite attendue",
    }
    return specs[difficulty] || "Difficulté standard"
  }

  /**
   * Exemples d'intégration d'intérêts dans les questions
   */
  private static getInterestExamples(interest: string, subject?: string): string[] {
    const examples: Record<string, Record<string, string[]>> = {
      "Football": {
        "Mathématiques": [
          "Calculer la vitesse d'un joueur",
          "Statistiques de match",
          "Géométrie du terrain"
        ],
        "Histoire": [
          "Histoire du foot au Maroc",
          "Coupe du Monde",
          "Joueurs marocains célèbres"
        ],
        "Géographie": [
          "Stades marocains",
          "Villes de foot",
          "Géographie des clubs"
        ],
        "Sciences": [
          "Physique du ballon",
          "Biologie du sport",
          "Nutrition sportive"
        ]
      },
      "K-Pop": {
        "Anglais": [
          "Vocabulaire K-Pop",
          "Traduction de chansons",
          "Culture coréenne"
        ],
        "Histoire": [
          "Histoire de la Corée",
          "Culture coréenne",
          "Influence culturelle"
        ],
        "Géographie": [
          "Géographie de la Corée",
          "Villes coréennes",
          "Culture asiatique"
        ]
      },
      "Danse": {
        "Histoire": [
          "Histoire de la danse",
          "Danse marocaine",
          "Culture marocaine"
        ],
        "Géographie": [
          "Origines géographiques",
          "Danses régionales",
          "Culture mondiale"
        ],
        "Sciences": [
          "Physique du mouvement",
          "Biologie du corps",
          "Anatomie"
        ]
      },
      "Musique": {
        "Histoire": [
          "Histoire de la musique",
          "Musique marocaine",
          "Artistes marocains"
        ],
        "Géographie": [
          "Musiques du monde",
          "Instruments régionaux",
          "Culture musicale"
        ],
        "Sciences": [
          "Physique du son",
          "Acoustique",
          "Biologie de l'audition"
        ]
      },
      "Jeux vidéo": {
        "Mathématiques": [
          "Calculs de jeu",
          "Statistiques",
          "Algorithmes"
        ],
        "Sciences": [
          "Physique des jeux",
          "Programmation",
          "Technologie"
        ],
        "Anglais": [
          "Vocabulaire gaming",
          "Communication",
          "Culture gaming"
        ]
      },
      "Cinéma": {
        "Français": [
          "Analyse de films",
          "Littérature cinématographique",
          "Expression"
        ],
        "Histoire": [
          "Histoire du cinéma",
          "Cinéma marocain",
          "Évolution culturelle"
        ],
        "Géographie": [
          "Cinémas du monde",
          "Lieux de tournage",
          "Culture visuelle"
        ]
      }
    }

    if (subject && examples[interest]?.[subject]) {
      return examples[interest][subject]
    }
    
    // Retourner des exemples généraux si pas de correspondance
    return examples[interest] ? Object.values(examples[interest]).flat().slice(0, 3) : []
  }

  /**
   * Exemple de quiz pour référence
   */
  private static getExampleQuiz() {
    return {
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
        },
        {
          type: "multiple_correct",
          question: "Quelles sont les propriétés d'un carré ? (Plusieurs réponses possibles)",
          options: [
            "Tous les côtés sont égaux",
            "Tous les angles sont droits",
            "Les diagonales sont perpendiculaires",
            "Un seul côté est égal"
          ],
          correct: [0, 1, 2],
          explanation: "Un carré a tous ses côtés égaux, tous ses angles droits (90°), et ses diagonales sont perpendiculaires et de même longueur."
        }
      ],
      time_limit_minutes: 15,
      passing_score: 60,
      xp_reward: 50
    }
  }
}

